import Stripe from 'stripe';

class StripeService {
  constructor() {
    this.stripe = null;
    this.initialized = false;
    
    // Stripe Product and Price IDs (to be created in Stripe Dashboard)
    this.VIBE_PRO_PRODUCT_ID = process.env.STRIPE_VIBE_PRO_PRODUCT_ID;
    this.VIBE_PRO_PRICE_ID = process.env.STRIPE_VIBE_PRO_PRICE_ID;
    this.VIBE_INPUT_TOKENS_METER_ID = process.env.STRIPE_VIBE_INPUT_TOKENS_METER_ID;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      this.initialized = true;
      console.log('✅ Stripe Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Stripe:', error);
      throw error;
    }
  }

  // Create checkout session for PRO subscription
  async createCheckoutSession(userId, userEmail, successUrl, cancelUrl) {
    try {
      // Create or retrieve Stripe customer
      let customer = null;
      
      // Try to find existing customer by email
      const existingCustomers = await this.stripe.customers.list({
        email: userEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        // Create new customer
        customer = await this.stripe.customers.create({
          email: userEmail,
          metadata: {
            firebase_uid: userId
          }
        });
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.VIBE_PRO_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            firebase_uid: userId
          }
        },
        metadata: {
          firebase_uid: userId
        }
      });

      console.log(`💳 Created checkout session for user ${userId}: ${session.id}`);
      return {
        sessionId: session.id,
        url: session.url,
        customerId: customer.id
      };

    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Report usage to Stripe (for usage-based billing)
  async reportUsage(customerId, inputTokens) {
    try {
      if (!this.VIBE_INPUT_TOKENS_METER_ID) {
        console.warn('⚠️ Stripe meter ID not configured, skipping usage report');
        return;
      }

      await this.stripe.billing.meterEvents.create({
        event_name: 'vibe_input_tokens',
        payload: {
          stripe_customer_id: customerId,
          value: inputTokens.toString()
        },
        timestamp: Math.floor(Date.now() / 1000)
      });

      console.log(`📊 Reported usage for customer ${customerId}`);
    } catch (error) {
      console.error('Error reporting usage to Stripe:', error);
      // Don't throw - usage reporting shouldn't break user experience
    }
  }

  // Create or update usage-based billing setup
  async setupUsageBilling(customerId, limitUsd) {
    try {
      // For now, we'll just update the customer metadata
      // In a full implementation, you might want to create a specific
      // usage-based subscription or update existing subscription
      await this.stripe.customers.update(customerId, {
        metadata: {
          usage_based_enabled: 'true',
          usage_limit_usd: limitUsd.toString()
        }
      });

      console.log(`💰 Setup usage billing for customer ${customerId}: $${limitUsd} limit`);
      return true;
    } catch (error) {
      console.error('Error setting up usage billing:', error);
      throw error;
    }
  }

  // Get customer's current subscription status
  async getCustomerSubscription(customerId) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        return subscriptions.data[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting customer subscription:', error);
      throw error;
    }
  }

  // Handle webhook events
  async handleWebhookEvent(rawBody, signature) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

      console.log(`📨 Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object);
        
        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceeded(event.data.object);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object);
        
        default:
          console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
          return { handled: false };
      }

    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Handle successful checkout completion
  async handleCheckoutCompleted(session) {
    try {
      const firebaseUid = session.metadata?.firebase_uid;
      if (!firebaseUid) {
        console.error('No Firebase UID in checkout session metadata');
        return { handled: false };
      }

      // Get the subscription
      const subscription = await this.stripe.subscriptions.retrieve(session.subscription);
      
      return {
        handled: true,
        action: 'upgrade_to_pro',
        firebaseUid,
        customerId: session.customer,
        subscriptionId: session.subscription,
        subscription
      };

    } catch (error) {
      console.error('Error handling checkout completion:', error);
      throw error;
    }
  }

  // Handle successful payment (monthly renewal)
  async handlePaymentSucceeded(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const firebaseUid = subscription.metadata?.firebase_uid;
      
      if (!firebaseUid) {
        console.error('No Firebase UID in subscription metadata');
        return { handled: false };
      }

      return {
        handled: true,
        action: 'reset_monthly_quota',
        firebaseUid,
        customerId: invoice.customer,
        subscriptionId: invoice.subscription
      };

    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  // Handle subscription updates
  async handleSubscriptionUpdated(subscription) {
    try {
      const firebaseUid = subscription.metadata?.firebase_uid;
      if (!firebaseUid) {
        return { handled: false };
      }

      return {
        handled: true,
        action: 'subscription_updated',
        firebaseUid,
        subscription
      };

    } catch (error) {
      console.error('Error handling subscription update:', error);
      throw error;
    }
  }

  // Handle subscription cancellation
  async handleSubscriptionDeleted(subscription) {
    try {
      const firebaseUid = subscription.metadata?.firebase_uid;
      if (!firebaseUid) {
        return { handled: false };
      }

      return {
        handled: true,
        action: 'downgrade_to_free',
        firebaseUid,
        subscription
      };

    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      throw error;
    }
  }

  // Get usage summary for a customer
  async getCustomerUsage(customerId, startDate, endDate) {
    try {
      // This would retrieve usage data from Stripe's billing system
      // For now, return placeholder data
      return {
        totalTokens: 0,
        totalCost: 0,
        period: { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error('Error getting customer usage:', error);
      throw error;
    }
  }
}

export default new StripeService(); 