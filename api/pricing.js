import express from 'express';
import firebaseService from './services/firebase-service.js';
import stripeService from './services/stripe-service.js';
import { verifyFirebaseAuth, verifyAuth } from './middleware/auth.js';

const router = express.Router();

// Services initialization status
let servicesInitialized = false;
let servicesInitializing = false;

// Initialize services safely and conditionally
async function initializeServicesIfNeeded() {
  if (servicesInitialized) return true;
  if (servicesInitializing) return false; // Avoid concurrent initialization
  
  servicesInitializing = true;
  
  try {
    // Try to initialize Firebase (required for pricing features)
    try {
      await firebaseService.initialize();
      console.log('✅ Firebase service initialized (pricing)');
    } catch (firebaseError) {
      console.log('⚠️ Firebase not configured - pricing features disabled:', firebaseError.message);
      throw firebaseError; // Pricing requires Firebase
    }
    
    // Try to initialize Stripe (required for pricing features)
    try {
      await stripeService.initialize();
      console.log('✅ Stripe service initialized (pricing)');
    } catch (stripeError) {
      console.log('⚠️ Stripe not configured - payment features disabled:', stripeError.message);
      throw stripeError; // Pricing requires Stripe
    }
    
    servicesInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Pricing services initialization failed:', error);
    return false;
  } finally {
    servicesInitializing = false;
  }
}

// POST /api/create-checkout-session
// Create Stripe checkout session for PRO subscription
router.post('/create-checkout-session', verifyFirebaseAuth, async (req, res) => {
  try {
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'Payment services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }

    const { success_url, cancel_url } = req.body;
    
    if (!success_url || !cancel_url) {
      return res.status(400).json({
        error: 'success_url and cancel_url are required'
      });
    }

    // Check if user is already PRO
    if (req.user.plan === 'PRO') {
      return res.status(400).json({
        error: 'User is already on PRO plan',
        code: 'ALREADY_PRO'
      });
    }

    const result = await stripeService.createCheckoutSession(
      req.user.uid,
      req.user.email,
      success_url,
      cancel_url
    );

    console.log(`💳 Checkout session created for ${req.user.uid}: ${result.sessionId}`);

    res.json({
      session_id: result.sessionId,
      checkout_url: result.url,
      customer_id: result.customerId
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// POST /api/stripe-webhook
// Handle Stripe webhook events (raw body required)
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'Payment services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const webhookResult = await stripeService.handleWebhookEvent(req.body, signature);
    
    if (!webhookResult.handled) {
      return res.status(200).json({ received: true, handled: false });
    }

    // Handle the action based on webhook type
    switch (webhookResult.action) {
      case 'upgrade_to_pro':
        await firebaseService.upgradeUserToPro(
          webhookResult.firebaseUid,
          webhookResult.customerId,
          webhookResult.subscriptionId
        );
        break;
      
      case 'reset_monthly_quota':
        await firebaseService.resetMonthlyQuota(webhookResult.firebaseUid);
        break;
      
      case 'downgrade_to_free':
        // Handle subscription cancellation
        const userRef = firebaseService.db.collection('users').doc(webhookResult.firebaseUid);
        await userRef.update({
          plan: 'FREE',
          remaining_tokens: 70000,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          usage_based_enabled: false,
          usage_limit_usd: 0,
          updated_at: firebaseService.db.FieldValue.serverTimestamp()
        });
        break;
    }

    console.log(`📨 Processed webhook: ${webhookResult.action} for user ${webhookResult.firebaseUid}`);

    res.status(200).json({ 
      received: true, 
      handled: true,
      action: webhookResult.action
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(400).json({ 
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

// POST /api/report-usage
// Report token usage after AI request
router.post('/report-usage', verifyAuth, async (req, res) => {
  try {
    // Initialize services if needed (allow partial initialization for legacy mode)
    await initializeServicesIfNeeded();
    const { input_tokens, output_tokens = 0 } = req.body;
    
    if (!input_tokens || typeof input_tokens !== 'number') {
      return res.status(400).json({
        error: 'input_tokens is required and must be a number'
      });
    }

    // Skip for system users
    if (req.user.isSystem) {
      return res.json({ success: true, message: 'System user - usage not tracked' });
    }

    // Update user tokens in Firebase
    await firebaseService.updateUserTokens(req.user.uid, input_tokens, output_tokens);

    // Report usage to Stripe for PRO users who have exhausted their quota
    if (req.user.plan === 'PRO' && req.user.stripe_customer_id) {
      const updatedUser = await firebaseService.getOrCreateUser(req.user.uid);
      
      if (updatedUser.remaining_tokens === 0 && updatedUser.usage_based_enabled) {
        await stripeService.reportUsage(req.user.stripe_customer_id, input_tokens);
      }
    }

    // Log usage event for analytics
    await firebaseService.logUsageEvent(req.user.uid, 'workflow_generation', {
      input_tokens,
      output_tokens,
      cost_usd: input_tokens * 0.00002 // For tracking
    });

    console.log(`📊 Usage reported for ${req.user.uid}: ${input_tokens} input, ${output_tokens} output tokens`);

    res.json({
      success: true,
      tokens_used: input_tokens,
      output_tokens: output_tokens
    });

  } catch (error) {
    console.error('Error reporting usage:', error);
    res.status(500).json({
      error: 'Failed to report usage',
      details: error.message
    });
  }
});

// GET /api/me
// Get current user information including plan and token usage
router.get('/me', verifyFirebaseAuth, async (req, res) => {
  try {
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'User services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }
    // Get fresh user data
    const userData = await firebaseService.getOrCreateUser(req.user.uid);
    
    // Calculate usage percentage
    const maxTokens = userData.plan === 'PRO' ? 1000000 : 70000;
    const usagePercentage = Math.round(((maxTokens - userData.remaining_tokens) / maxTokens) * 100);

    // Get Stripe subscription info if PRO
    let subscriptionInfo = null;
    if (userData.plan === 'PRO' && userData.stripe_customer_id) {
      try {
        subscriptionInfo = await stripeService.getCustomerSubscription(userData.stripe_customer_id);
      } catch (error) {
        console.warn('Could not fetch subscription info:', error.message);
      }
    }

    const response = {
      user: {
        uid: userData.uid,
        email: userData.email,
        plan: userData.plan,
        remaining_tokens: userData.remaining_tokens,
        this_month_usage_tokens: userData.this_month_usage_tokens || 0,
        this_month_usage_usd: userData.this_month_usage_usd || 0,
        total_tokens_used: userData.total_tokens_used || 0,
        usage_based_enabled: userData.usage_based_enabled || false,
        usage_limit_usd: userData.usage_limit_usd || 0,
        created_at: userData.created_at,
        last_reset_at: userData.last_reset_at
      },
      quota: {
        max_tokens: maxTokens,
        remaining_tokens: userData.remaining_tokens,
        usage_percentage: usagePercentage,
        can_make_request: userData.remaining_tokens >= 10000
      },
      subscription: subscriptionInfo ? {
        id: subscriptionInfo.id,
        status: subscriptionInfo.status,
        current_period_start: subscriptionInfo.current_period_start,
        current_period_end: subscriptionInfo.current_period_end,
        cancel_at_period_end: subscriptionInfo.cancel_at_period_end
      } : null
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      error: 'Failed to fetch user information',
      details: error.message
    });
  }
});

// POST /api/enable-usage-based
// Enable usage-based billing for PRO users
router.post('/enable-usage-based', verifyFirebaseAuth, async (req, res) => {
  try {
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'Billing services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }
    const { limit_usd } = req.body;
    
    if (!limit_usd || typeof limit_usd !== 'number' || limit_usd <= 0) {
      return res.status(400).json({
        error: 'limit_usd is required and must be a positive number'
      });
    }

    // Check if user is PRO
    if (req.user.plan !== 'PRO') {
      return res.status(400).json({
        error: 'Usage-based billing is only available for PRO users',
        code: 'NOT_PRO_USER'
      });
    }

    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        error: 'No Stripe customer ID found',
        code: 'NO_STRIPE_CUSTOMER'
      });
    }

    // Enable usage-based billing in Firebase
    await firebaseService.enableUsageBased(req.user.uid, limit_usd);

    // Setup usage billing in Stripe
    await stripeService.setupUsageBilling(req.user.stripe_customer_id, limit_usd);

    console.log(`💳 Enabled usage-based billing for ${req.user.uid}: $${limit_usd} limit`);

    res.json({
      success: true,
      usage_based_enabled: true,
      usage_limit_usd: limit_usd
    });

  } catch (error) {
    console.error('Error enabling usage-based billing:', error);
    res.status(500).json({
      error: 'Failed to enable usage-based billing',
      details: error.message
    });
  }
});

// GET /api/pricing
// Get pricing information and plans
router.get('/pricing', async (req, res) => {
  try {
    const pricing = {
      plans: {
        free: {
          name: 'Free',
          price_usd: 0,
          price_display: 'Gratuit',
          tokens_included: 70000,
          overage_rate: null,
          features: [
            '70,000 tokens input / mois',
            'Génération de workflows IA',
            'Extension Chrome',
            'Support communautaire'
          ]
        },
        pro: {
          name: 'Pro',
          price_usd: 20,
          price_display: '20 US$',
          tokens_included: 1000000,
          overage_rate: 0.00002,
          overage_display: '0,20 US$ / 10,000 tokens',
          features: [
            '1,000,000 tokens input / mois',
            'Dépassement usage-based optionnel',
            'Génération de workflows IA',
            'Extension Chrome',
            'Support prioritaire',
            'Statistiques avancées'
          ]
        }
      },
      token_info: {
        estimation: '1 workflow simple ≈ 8,000-15,000 tokens',
        complex_estimation: '1 workflow complexe ≈ 15,000-30,000 tokens'
      }
    };

    res.json(pricing);

  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({
      error: 'Failed to fetch pricing information'
    });
  }
});

export default router; 