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

    console.log(`📊 Usage reported for user ${req.user.uid} (plan: ${req.user.plan})`);

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

// POST /api/send-verification-email
// ⚠️ DEPRECATED: This endpoint used Firebase Dynamic Links which was shut down on August 25, 2025
// Email verification is now handled directly by the Chrome extension using Firebase REST API
// See: https://firebase.google.com/support/dynamic-links-faq
router.post('/send-verification-email', async (req, res) => {
  try {
    // Return explanation about the deprecation
    res.status(410).json({
      error: 'This endpoint is deprecated due to Firebase Dynamic Links shutdown',
      code: 'ENDPOINT_DEPRECATED',
      message: 'Email verification is now handled client-side using Firebase REST API',
      migration_info: {
        reason: 'Firebase Dynamic Links was shut down on August 25, 2025',
        new_method: 'Chrome extension now uses Firebase REST API directly',
        documentation: 'https://firebase.google.com/support/dynamic-links-faq'
      },
      alternative: 'Use Firebase SDK client-side with sendEmailVerification() or REST API sendOobCode'
    });
  } catch (error) {
    console.error('Deprecated endpoint accessed:', error);
    res.status(410).json({
      error: 'Endpoint deprecated - Firebase Dynamic Links no longer available'
    });
  }
});

// POST /api/initialize-new-user
// Initialize user entry in Firestore after Firebase Auth account creation (no email verification required)
router.post('/initialize-new-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH'
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'User services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }

    try {
      // Verify token with Firebase (but don't check email verification for new users)
      const decodedToken = await firebaseService.verifyIdToken(idToken);
      
      // Detect if it's Google auth or email/password
      const isGoogleAuth = decodedToken.firebase?.sign_in_provider === 'google.com';
      const emailVerified = decodedToken.email_verified || isGoogleAuth;
      
      // Get or create user in Firestore
      const userData = await firebaseService.getOrCreateUser(
        decodedToken.uid, 
        decodedToken.email,
        emailVerified
      );
      
      // Log user initialization event
      await firebaseService.logUsageEvent(decodedToken.uid, 'user_initialized', {
        email: decodedToken.email,
        plan: userData.plan,
        email_verified: emailVerified,
        tokens_granted: userData.remaining_tokens,
        created_via: 'chrome_extension_new_user'
      });

      console.log(`👤 New user initialized in Firestore: ${decodedToken.uid} (${decodedToken.email}) - Email verified: ${emailVerified}, Tokens: ${userData.remaining_tokens}`);

      res.json({
        success: true,
        user: {
          uid: userData.uid,
          email: userData.email,
          plan: userData.plan,
          email_verified: emailVerified,
          remaining_tokens: userData.remaining_tokens,
          created_at: userData.created_at
        },
        message: emailVerified 
          ? 'User successfully initialized with active tokens'
          : 'User created - email verification required to activate tokens'
      });

    } catch (error) {
      console.error('Error verifying token for new user:', error);
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }

  } catch (error) {
    console.error('Error initializing new user:', error);
    res.status(500).json({
      error: 'Failed to initialize new user',
      details: error.message
    });
  }
});

// POST /api/initialize-user
// Initialize user entry in Firestore after Firebase Auth account creation
router.post('/initialize-user', verifyFirebaseAuth, async (req, res) => {
  try {
    // Initialize services if needed
    const initialized = await initializeServicesIfNeeded();
    if (!initialized) {
      return res.status(503).json({
        error: 'User services not available',
        code: 'SERVICES_NOT_CONFIGURED'
      });
    }

    // Get or create user in Firestore (this will create the entry if it doesn't exist)
    const userData = await firebaseService.getOrCreateUser(req.user.uid, req.user.email, req.user.email_verified);
    
    // Log user initialization event
    await firebaseService.logUsageEvent(req.user.uid, 'user_initialized', {
      email: req.user.email,
      plan: userData.plan,
      email_verified: userData.email_verified,
      tokens_granted: userData.remaining_tokens,
      created_via: 'chrome_extension'
    });

    console.log(`👤 User initialized in Firestore: ${req.user.uid} (${req.user.email}) - Email verified: ${req.user.email_verified}, Tokens: ${userData.remaining_tokens}`);

    res.json({
      success: true,
      user: {
        uid: userData.uid,
        email: userData.email,
        plan: userData.plan,
        email_verified: userData.email_verified,
        remaining_tokens: userData.remaining_tokens,
        created_at: userData.created_at
      },
      message: userData.email_verified 
        ? 'User successfully initialized with active tokens'
        : 'User created - email verification required to activate tokens'
    });

  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({
      error: 'Failed to initialize user',
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
    const maxTokens = userData.plan === 'PRO' ? 1500000 : 70000;
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

    // Setup usage billing in Stripe (optional)
    try {
    await stripeService.setupUsageBilling(req.user.stripe_customer_id, limit_usd);
    } catch (stripeErr) {
      console.warn('⚠️ Stripe setupUsageBilling failed:', stripeErr.message);
      // Do not fail the request if Stripe metadata update fails
    }

    // -------- NEW: immediate charge of current outstanding usage --------
    try {
      const freshUser = await firebaseService.getOrCreateUser(req.user.uid);
      const currentUsage = freshUser.this_month_usage_usd || 0;
      if (currentUsage > 0) {
        console.log(`💳 Charging outstanding usage $${currentUsage.toFixed(2)} before new limit applies`);
        await stripeService.chargeUsageNow(freshUser.stripe_customer_id, currentUsage, 'Pay-as-you-go usage prior to limit increase');
        await firebaseService.incrementPaidUsage(req.user.uid, currentUsage);
        await firebaseService.resetUsageBudget(req.user.uid);
      }
    } catch (chargeErr) {
      console.error('Error charging outstanding usage:', chargeErr);
      // We still return success; user will be charged later via invoice if this fails
    }

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
          price_display: 'Free',
          tokens_included: 70000,
          overage_rate: null,
          features: [
            '70,000 input tokens / month',
            'AI workflow generation',
            'Chrome extension',
            'Community support'
          ]
        },
        pro: {
          name: 'Pro',
          price_usd: 20,
          price_display: '$20 USD',
          tokens_included: 1500000,
          overage_rate: 0.00002,
          overage_display: '$0.20 USD / 10,000 tokens',
          features: [
            '1,500,000 input tokens / month',
            'Optional usage-based overage',
            'AI workflow generation',
            'Chrome extension',
            'Priority support',
            'Advanced statistics'
          ]
        }
      },
      token_info: {
        estimation: '1 simple workflow ≈ 8,000-15,000 tokens',
        complex_estimation: '1 complex workflow ≈ 15,000-30,000 tokens'
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