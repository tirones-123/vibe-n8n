import firebaseService from '../services/firebase-service.js';

// Middleware to verify Firebase authentication token
export async function verifyFirebaseAuth(req, res, next) {
  try {
    // Check if Firebase is initialized
    if (!firebaseService.initialized) {
      return res.status(503).json({
        error: 'Authentication service not available',
        code: 'FIREBASE_NOT_INITIALIZED'
      });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH'
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Firebase
    const decodedToken = await firebaseService.verifyIdToken(idToken);
    
    // NOUVEAU: Vérifier que l'email est vérifié (sauf pour Google qui est auto-vérifié)
    const isGoogleAuth = decodedToken.firebase?.sign_in_provider === 'google.com';
    
    // Get or create user in our database FIRST
    const user = await firebaseService.getOrCreateUser(
      decodedToken.uid, 
      decodedToken.email,
      decodedToken.email_verified || isGoogleAuth  // Google est toujours considéré comme vérifié
    );
    
    // 🔄 ACTIVATION AUTOMATIQUE : Vérifier le VRAI statut email avec Firebase Admin
    const currentEmailStatus = await firebaseService.checkEmailVerificationStatus(decodedToken.uid);
    const serverEmailVerified = currentEmailStatus?.emailVerified || isGoogleAuth;
    
    if (!user.email_verified && serverEmailVerified) {
      console.log(`🔓 Email verified on server for user ${decodedToken.uid}, activating account...`);
      const activatedUser = await firebaseService.activateUserAfterEmailVerification(decodedToken.uid);
      user.email_verified = true;
      user.remaining_tokens = activatedUser.remaining_tokens;
      console.log(`✅ Auto-activated user ${decodedToken.uid} - granted ${activatedUser.remaining_tokens} tokens`);
    }
    
    // MAINTENANT vérifier que l'email est vérifié (utiliser le statut serveur, pas le token client)
    if (!isGoogleAuth && !serverEmailVerified) {
      return res.status(403).json({
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before using the AI assistant. Check your inbox for the verification email.',
        email: decodedToken.email,
        action: 'verify_email'
      });
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: serverEmailVerified,  // Utiliser le vrai statut serveur
      ...user
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }
}

// Middleware to check token quota before processing request
export async function checkTokenQuota(estimatedTokens = 10000) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Skip quota check for system users or if Firebase is not available
      if (req.user.isSystem || !firebaseService.initialized) {
        return next();
      }

      const { allowed, reason, userData } = await firebaseService.canUserMakeRequest(
        req.user.uid, 
        estimatedTokens
      );

      if (!allowed) {
        let errorResponse = {
          error: 'Quota exceeded',
          code: reason,
          user: {
            plan: userData?.plan,
            remaining_tokens: userData?.remaining_tokens,
            usage_based_enabled: userData?.usage_based_enabled,
            usage_limit_usd: userData?.usage_limit_usd,
            this_month_usage_usd: userData?.this_month_usage_usd
          }
        };

        // Customize error message based on reason
        switch (reason) {
          case 'FREE_LIMIT_EXCEEDED':
            errorResponse.message = 'Tu as atteint la limite gratuite. Passe au plan Pro pour continuer.';
            errorResponse.action = 'upgrade_to_pro';
            break;
          
          case 'PRO_LIMIT_EXCEEDED':
            errorResponse.message = 'Quota Pro atteint. Activer Usage-Based Spending ?';
            errorResponse.action = 'enable_usage_based';
            errorResponse.options = [20, 50, 100]; // USD spending limits
            break;
          
          case 'USAGE_LIMIT_EXCEEDED':
            errorResponse.message = 'Budget usage-based épuisé. Augmenter la limite ?';
            errorResponse.action = 'increase_usage_limit';
            break;
          
          default:
            errorResponse.message = 'Quota insuffisant pour cette requête.';
        }

        return res.status(429).json(errorResponse);
      }

      // Attach updated user data to request
      req.user = { ...req.user, ...userData };
      next();

    } catch (error) {
      console.error('Token quota check error:', error);
      return res.status(500).json({
        error: 'Error checking token quota',
        code: 'QUOTA_CHECK_ERROR'
      });
    }
  };
}

// Middleware for backward compatibility with old API key system
export async function verifyLegacyApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const backendApiKey = process.env.BACKEND_API_KEY;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing authorization header',
        code: 'MISSING_AUTH'
      });
    }

    const providedKey = authHeader.substring(7);
    
    if (providedKey !== backendApiKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // For legacy requests, create a "system" user
    req.user = {
      uid: 'system',
      email: 'system@vibe-n8n.com',
      plan: 'SYSTEM',
      remaining_tokens: 999999999, // Unlimited for system
      isSystem: true
    };

    next();
  } catch (error) {
    console.error('Legacy API key verification error:', error);
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'API_KEY_ERROR'
    });
  }
}

// Combined middleware that accepts both Firebase auth and legacy API key
export async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing authorization header',
      code: 'MISSING_AUTH'
    });
  }

  const token = authHeader.substring(7);
  
  // Check if it's the legacy API key
  if (token === process.env.BACKEND_API_KEY) {
    return verifyLegacyApiKey(req, res, next);
  } else {
    // Try Firebase authentication (only if Firebase is initialized)
    if (firebaseService.initialized) {
      return verifyFirebaseAuth(req, res, next);
    } else {
      // Firebase not available, reject non-legacy requests
      return res.status(503).json({
        error: 'Authentication service not available - use legacy API key',
        code: 'FIREBASE_NOT_AVAILABLE'
      });
    }
  }
}

// NEW: Middleware for anonymous first-time users
export async function verifyAuthOrAllowAnonymous(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // Check if it's a special anonymous token for first-time users
  if (authHeader?.startsWith('Bearer ANONYMOUS_')) {
    const clientId = authHeader.substring(15); // Remove 'Bearer ANONYMOUS_' prefix
    
    // Validate the anonymous token format (should be a UUID-like string)
    if (clientId && clientId.length >= 20 && /^[a-f0-9-]+$/i.test(clientId)) {
      // Create anonymous user session
      req.user = {
        uid: `anonymous_${clientId}`,
        email: 'anonymous@first-try.com',
        plan: 'ANONYMOUS',
        remaining_tokens: 20000, // One free request (generous quota for complex workflow)
        isAnonymous: true,
        clientId: clientId
      };
      
      console.log('🎭 Anonymous first-time user allowed:', clientId.substring(0, 8) + '...');
      return next();
    }
  }
  
  // If not anonymous or invalid anonymous token, use normal auth
  return verifyAuth(req, res, next);
}

// NEW: Quota middleware adapted for anonymous users
export async function checkTokenQuotaOrAnonymous(estimatedTokens = 10000) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Special handling for anonymous users
      if (req.user.isAnonymous) {
        if (estimatedTokens > req.user.remaining_tokens) {
          return res.status(429).json({
            error: 'Anonymous quota exceeded',
            code: 'ANONYMOUS_LIMIT_EXCEEDED',
            message: 'You\'ve used your free trial! Sign up to continue generating unlimited workflows.',
            action: 'signup_required',
            user: {
              plan: 'ANONYMOUS',
              remaining_tokens: 0,
              tried_tokens: estimatedTokens
            }
          });
        }
        
        // Allow the request for anonymous user
        console.log(`🎭 Anonymous user ${req.user.clientId} using ${estimatedTokens} tokens`);
        return next();
      }

      // Skip quota check for system users or if Firebase is not available
      if (req.user.isSystem || !firebaseService.initialized) {
        return next();
      }

      const { allowed, reason, userData } = await firebaseService.canUserMakeRequest(
        req.user.uid, 
        estimatedTokens
      );

      if (!allowed) {
        let errorResponse = {
          error: 'Quota exceeded',
          code: reason,
          user: {
            plan: userData?.plan,
            remaining_tokens: userData?.remaining_tokens,
            usage_based_enabled: userData?.usage_based_enabled,
            usage_limit_usd: userData?.usage_limit_usd,
            this_month_usage_usd: userData?.this_month_usage_usd
          }
        };

        // Customize error message based on reason
        switch (reason) {
          case 'FREE_LIMIT_EXCEEDED':
            errorResponse.message = 'Tu as atteint la limite gratuite. Passe au plan Pro pour continuer.';
            errorResponse.action = 'upgrade_to_pro';
            break;
          
          case 'PRO_LIMIT_EXCEEDED':
            errorResponse.message = 'Quota Pro atteint. Activer Usage-Based Spending ?';
            errorResponse.action = 'enable_usage_based';
            errorResponse.options = [20, 50, 100]; // USD spending limits
            break;
          
          case 'USAGE_LIMIT_EXCEEDED':
            errorResponse.message = 'Budget usage-based épuisé. Augmenter la limite ?';
            errorResponse.action = 'increase_usage_limit';
            break;
          
          default:
            errorResponse.message = 'Quota insuffisant pour cette requête.';
        }

        return res.status(429).json(errorResponse);
      }

      // Attach updated user data to request
      req.user = { ...req.user, ...userData };
      next();

    } catch (error) {
      console.error('Token quota check error:', error);
      return res.status(500).json({
        error: 'Error checking token quota',
        code: 'QUOTA_CHECK_ERROR'
      });
    }
  };
} 