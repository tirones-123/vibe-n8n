import admin from 'firebase-admin';

class FirebaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // DEBUG: Logs des variables Firebase
      console.log('🔍 Firebase Environment Variables Debug:');
      console.log('  FIREBASE_PROJECT_ID:', JSON.stringify(process.env.FIREBASE_PROJECT_ID));
      console.log('  FIREBASE_CLIENT_EMAIL:', JSON.stringify(process.env.FIREBASE_CLIENT_EMAIL));
      console.log('  FIREBASE_PRIVATE_KEY_ID:', JSON.stringify(process.env.FIREBASE_PRIVATE_KEY_ID));
      console.log('  FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
      
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : {
              type: "service_account",
              project_id: process.env.FIREBASE_PROJECT_ID,
              private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
              private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              client_email: process.env.FIREBASE_CLIENT_EMAIL,
              client_id: process.env.FIREBASE_CLIENT_ID,
              auth_uri: "https://accounts.google.com/o/oauth2/auth",
              token_uri: "https://oauth2.googleapis.com/token",
              auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
              client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
            };

        console.log('🔍 ServiceAccount object:', JSON.stringify(serviceAccount, null, 2));

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
        });
      }

      this.db = admin.firestore();
      this.initialized = true;
      console.log('✅ Firebase Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error);
      throw error;
    }
  }

  // Verify Firebase auth token
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      throw new Error('Invalid authentication token');
    }
  }

  // Get or create user with default quota
  async getOrCreateUser(uid, email = null) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Create new user with FREE plan defaults
        const newUser = {
          uid,
          email,
          plan: 'FREE',
          remaining_tokens: 70000, // Free plan: 70k tokens
          this_month_usage_tokens: 0,
          this_month_usage_usd: 0,
          total_tokens_used: 0,
          total_output_tokens: 0,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          usage_based_enabled: false,
          usage_limit_usd: 0,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          last_reset_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await userRef.set(newUser);
        console.log(`📝 Created new FREE user: ${uid}`);
        return { ...newUser, id: uid };
      }

      return { id: uid, ...userDoc.data() };
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw error;
    }
  }

  // Update user tokens after usage
  async updateUserTokens(uid, inputTokens, outputTokens = 0) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      
      await this.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const newRemainingTokens = Math.max(0, userData.remaining_tokens - inputTokens);
        
        const updates = {
          remaining_tokens: newRemainingTokens,
          this_month_usage_tokens: (userData.this_month_usage_tokens || 0) + inputTokens,
          total_tokens_used: (userData.total_tokens_used || 0) + inputTokens,
          total_output_tokens: (userData.total_output_tokens || 0) + outputTokens,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Calculate usage cost for PRO users who go over quota
        if (userData.plan === 'PRO' && newRemainingTokens === 0 && userData.remaining_tokens > 0) {
          const overageTokens = inputTokens - userData.remaining_tokens;
          const overageCost = overageTokens * 0.00002; // $0.00002 per token
          updates.this_month_usage_usd = (userData.this_month_usage_usd || 0) + overageCost;
        }

        transaction.update(userRef, updates);
      });

      console.log(`📊 Updated tokens for ${uid}: -${inputTokens} input, +${outputTokens} output`);
    } catch (error) {
      console.error('Error updating user tokens:', error);
      throw error;
    }
  }

  // Upgrade user to PRO plan
  async upgradeUserToPro(uid, stripeCustomerId, subscriptionId) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      
      await userRef.update({
        plan: 'PRO',
        remaining_tokens: 1000000, // PRO plan: 1M tokens
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_reset_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`🎉 Upgraded user ${uid} to PRO plan`);
    } catch (error) {
      console.error('Error upgrading user to PRO:', error);
      throw error;
    }
  }

  // Reset monthly quota (called by Stripe webhook on billing cycle)
  async resetMonthlyQuota(uid) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const baseTokens = userData.plan === 'PRO' ? 1000000 : 70000;

      await userRef.update({
        remaining_tokens: baseTokens,
        this_month_usage_tokens: 0,
        this_month_usage_usd: 0,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        last_reset_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`🔄 Reset monthly quota for ${uid} (${userData.plan})`);
    } catch (error) {
      console.error('Error resetting monthly quota:', error);
      throw error;
    }
  }

  // Enable usage-based billing
  async enableUsageBased(uid, limitUsd) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      
      await userRef.update({
        usage_based_enabled: true,
        usage_limit_usd: limitUsd,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`💳 Enabled usage-based billing for ${uid}: $${limitUsd} limit`);
    } catch (error) {
      console.error('Error enabling usage-based billing:', error);
      throw error;
    }
  }

  // Check if user can make request (has enough tokens)
  async canUserMakeRequest(uid, estimatedTokens = 10000) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { allowed: false, reason: 'USER_NOT_FOUND' };
      }

      const userData = userDoc.data();
      
      // Check basic token quota
      if (userData.remaining_tokens >= estimatedTokens) {
        return { allowed: true, userData };
      }

      // For PRO users, check usage-based allowance
      if (userData.plan === 'PRO' && userData.usage_based_enabled) {
        const remainingUsageBudget = userData.usage_limit_usd - (userData.this_month_usage_usd || 0);
        const estimatedCost = estimatedTokens * 0.00002;
        
        if (remainingUsageBudget >= estimatedCost) {
          return { allowed: true, userData };
        }
        
        return { 
          allowed: false, 
          reason: 'USAGE_LIMIT_EXCEEDED',
          userData 
        };
      }

      // Determine blocking reason
      const reason = userData.plan === 'FREE' ? 'FREE_LIMIT_EXCEEDED' : 'PRO_LIMIT_EXCEEDED';
      return { allowed: false, reason, userData };

    } catch (error) {
      console.error('Error checking user permissions:', error);
      return { allowed: false, reason: 'ERROR' };
    }
  }

  // Log usage event for analytics
  async logUsageEvent(uid, eventType, metadata = {}) {
    try {
      const eventRef = this.db.collection('usage_events').doc();
      
      await eventRef.set({
        uid,
        event_type: eventType,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging usage event:', error);
      // Don't throw - analytics shouldn't break user experience
    }
  }
}

export default new FirebaseService(); 