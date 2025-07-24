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
    
    // NEW: Enforce email verification
    try {
      await firebaseService.verifyEmailVerification(decodedToken.uid, decodedToken.email);
    } catch (verificationError) {
      if (verificationError.message === 'EMAIL_NOT_VERIFIED') {
        return res.status(403).json({
          error: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Vous devez vérifier votre adresse email avant d\'utiliser ce service.',
          action: 'verify_email',
          email: decodedToken.email
        });
      }
      throw verificationError; // Re-throw other errors
    }
    
    // Get or create user in our database
    const user = await firebaseService.getOrCreateUser(decodedToken.uid, decodedToken.email);
    
    // Log authentication event
    await firebaseService.logUsageEvent(decodedToken.uid, 'USER_AUTHENTICATED', {
      email: decodedToken.email,
      auth_method: 'firebase_id_token',
      email_verified: true,
      timestamp: new Date().toISOString()
    });
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: true, // We know it's verified at this point
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