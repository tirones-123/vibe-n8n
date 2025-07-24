import admin from 'firebase-admin';

class FirebaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
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
        // Anti-abuse checks before creating user
        const abuseCheck = await this.performAbuseChecks(email, uid);
        
        let initialTokens = 70000; // Default FREE tokens
        let accountStatus = 'active';
        
        // Reduce tokens for suspicious accounts
        if (abuseCheck.riskLevel === 'medium') {
          initialTokens = 30000; // Reduced tokens for medium risk
          console.log(`⚠️ Medium risk account detected: ${email}, reduced tokens to ${initialTokens}`);
        } else if (abuseCheck.riskLevel === 'high') {
          initialTokens = 5000; // Very limited tokens for high risk
          accountStatus = 'limited';
          console.log(`🚨 High risk account detected: ${email}, limited to ${initialTokens} tokens`);
        }
        
        // Create new user with anti-abuse data
        const newUser = {
          uid,
          email,
          plan: 'FREE',
          remaining_tokens: initialTokens,
          initial_tokens_granted: initialTokens,
          account_status: accountStatus,
          risk_level: abuseCheck.riskLevel,
          email_verified: false, // Start as unverified
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
          last_reset_at: admin.firestore.FieldValue.serverTimestamp(),
          // Anti-abuse metadata
          signup_metadata: abuseCheck.metadata,
          verification_sent_at: null,
          verified_at: null
        };

        await userRef.set(newUser);
        
        // Send verification email (Firebase will handle this)
        try {
          await admin.auth().generateEmailVerificationLink(email);
          await userRef.update({
            verification_sent_at: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`📧 Verification email sent to: ${email}`);
        } catch (emailError) {
          console.warn(`⚠️ Could not send verification email to ${email}:`, emailError.message);
        }
        
        console.log(`📝 Created new ${abuseCheck.riskLevel.toUpperCase()} risk user: ${uid} (${initialTokens} tokens)`);
        return { ...newUser, id: uid };
      }

      return { id: uid, ...userDoc.data() };
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw error;
    }
  }

  // Perform anti-abuse checks on new account creation
  async performAbuseChecks(email, uid) {
    try {
      let riskLevel = 'low';
      let riskFactors = [];
      let metadata = {
        check_timestamp: new Date().toISOString(),
        email_domain: email ? email.split('@')[1] : null,
        checks_performed: []
      };

      // Check 1: Email domain analysis
      if (email) {
        const domain = email.split('@')[1];
        const suspiciousDomains = [
          'tempmail.org', '10minutemail.com', 'guerrillamail.com', 
          'mailinator.com', 'temp-mail.org', 'throwaway.email',
          'maildrop.cc', 'mailnesia.com', 'yopmail.com'
        ];
        
        if (suspiciousDomains.includes(domain.toLowerCase())) {
          riskFactors.push('temporary_email_domain');
          riskLevel = 'high';
        }
        
        metadata.checks_performed.push('email_domain_check');
      }

      // Check 2: Recent account creation rate from same email domain
      if (email) {
        const domain = email.split('@')[1];
        const recentAccountsQuery = await this.db.collection('users')
          .where('signup_metadata.email_domain', '==', domain)
          .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24h
          .get();
        
        if (recentAccountsQuery.size > 500) {
          riskFactors.push('domain_signup_burst');
          riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }
        
        metadata.domain_recent_signups = recentAccountsQuery.size;
        metadata.checks_performed.push('domain_rate_check');
      }

      // Check 3: Email pattern analysis (suspicious patterns)
      if (email) {
        const emailPatterns = [
          /^[a-z]+\d{3,}@/, // letters followed by many numbers
          /^test\d*@/, // test emails
          /^user\d*@/, // generic user emails
          /^\w+\+\w+@/ // plus addressing (often used for multiple accounts)
        ];
        
        const isSuspiciousPattern = emailPatterns.some(pattern => pattern.test(email.toLowerCase()));
        if (isSuspiciousPattern) {
          riskFactors.push('suspicious_email_pattern');
          riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }
        
        metadata.checks_performed.push('email_pattern_check');
      }

      metadata.risk_factors = riskFactors;
      metadata.final_risk_level = riskLevel;

      // Log the risk assessment
      await this.logSecurityEvent('account_creation_risk_assessment', {
        email,
        uid,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        metadata
      });

      return { riskLevel, riskFactors, metadata };
    } catch (error) {
      console.error('Error performing abuse checks:', error);
      // Default to medium risk if checks fail
      return { 
        riskLevel: 'medium', 
        riskFactors: ['check_failed'], 
        metadata: { error: error.message } 
      };
    }
  }

  // Verify email and unlock full quota
  async verifyEmailAndUnlockQuota(uid) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Only upgrade if not already verified and account is limited
      if (!userData.email_verified && userData.initial_tokens_granted < 70000) {
        const fullTokens = 70000;
        
        await userRef.update({
          email_verified: true,
          remaining_tokens: admin.firestore.FieldValue.increment(fullTokens - userData.initial_tokens_granted),
          account_status: 'active',
          verified_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Email verified for ${uid}, upgraded to ${fullTokens} tokens`);
        
        await this.logSecurityEvent('email_verification_completed', {
          uid,
          email: userData.email,
          tokens_granted: fullTokens - userData.initial_tokens_granted
        });
      }
    } catch (error) {
      console.error('Error verifying email and unlocking quota:', error);
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

  // Check if user can make request (enhanced with email verification)
  async canUserMakeRequest(uid, estimatedTokens = 10000) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return { allowed: false, reason: 'USER_NOT_FOUND' };
      }

      const userData = userDoc.data();
      
      // Block if account is in limited status and email not verified
      if (userData.account_status === 'limited' && !userData.email_verified) {
        return { 
          allowed: false, 
          reason: 'EMAIL_VERIFICATION_REQUIRED',
          userData,
          message: 'Vérifiez votre email pour débloquer votre quota complet'
        };
      }
      
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

  // Log security events for monitoring
  async logSecurityEvent(eventType, metadata = {}) {
    try {
      const eventRef = this.db.collection('security_events').doc();
      
      await eventRef.set({
        event_type: eventType,
        metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'firebase_service'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
      // Don't throw - security logging shouldn't break user experience
    }
  }
}

export default new FirebaseService(); 