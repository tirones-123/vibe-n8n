import { createWorkflowRAGService } from './rag/workflow-rag-service.js';
import firebaseService from './services/firebase-service.js';
import stripeService from './services/stripe-service.js';
import { verifyAuth, checkTokenQuota } from './middleware/auth.js';

// Services initialization status
let servicesInitialized = false;
let servicesInitializing = false;

// Initialize services safely and conditionally
async function initializeServicesIfNeeded() {
  if (servicesInitialized) return { 
    success: true, 
    firebase: firebaseService.initialized, 
    stripe: stripeService.initialized 
  };
  
  if (servicesInitializing) return { 
    success: false, 
    reason: 'ALREADY_INITIALIZING' 
  };
  
  servicesInitializing = true;
  let firebaseReady = false;
  let stripeReady = false;
  
  try {
    // Try to initialize Firebase (optional for RAG-only mode)
    try {
      await firebaseService.initialize();
      firebaseReady = true;
      console.log('✅ Firebase service initialized');
    } catch (firebaseError) {
      console.log('⚠️ Firebase not configured - running in legacy mode:', firebaseError.message);
    }
    
    // Try to initialize Stripe (optional for RAG-only mode)
    try {
      await stripeService.initialize();
      stripeReady = true;
      console.log('✅ Stripe service initialized');
    } catch (stripeError) {
      console.log('⚠️ Stripe not configured - payment features disabled:', stripeError.message);
    }
    
    servicesInitialized = true;
    
    return { 
      success: true, 
      firebase: firebaseReady, 
      stripe: stripeReady 
    };
  } catch (error) {
    console.error('❌ Services initialization failed:', error);
    return { 
      success: false, 
      error: error.message,
      firebase: firebaseReady, 
      stripe: stripeReady 
    };
  } finally {
    servicesInitializing = false;
  }
}

// Monitoring et stats
let requestStats = {
  total: 0,
  success: 0,
  errors: 0,
  largeWorkflows: 0,
  compressionUsed: 0,
  chunkingUsed: 0,
  tokenQuotaBlocked: 0
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize services on first request
  const servicesReady = await initializeServicesIfNeeded();
  console.log('🔧 Services initialization result:', servicesReady);

  // Manual authentication logic to avoid middleware timing issues
  const authHeader = req.headers.authorization;
  const authMethod = req.headers['x-auth-method'] || 'UNKNOWN';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing authorization header',
      code: 'MISSING_AUTH'
    });
  }

  const token = authHeader.substring(7);
  
  // Check if it's the legacy API key
  if (token === process.env.BACKEND_API_KEY) {
    // Legacy API key authentication
    req.user = {
      uid: 'system',
      email: 'system@vibe-n8n.com',
      plan: 'SYSTEM',
      remaining_tokens: 999999999,
      isSystem: true
    };
    console.log(`🔑 Legacy API key authentication successful (method: ${authMethod})`);
  } else {
    // Firebase authentication
    if (!servicesReady.firebase) {
      return res.status(503).json({
        error: 'Firebase authentication not available',
        code: 'FIREBASE_NOT_READY',
        details: servicesReady
      });
    }

    try {
      // Verify token with Firebase
      const decodedToken = await firebaseService.verifyIdToken(token);
      
      // Detect auth method
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
          action: 'verify_email',
          remaining_tokens: user.remaining_tokens || 0
        });
      }
      
      // Attach user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: serverEmailVerified,  // Utiliser le vrai statut serveur
        ...user
      };
      
      console.log(`🔥 Firebase authentication successful (method: ${authMethod}):`, req.user.email, `- Plan: ${req.user.plan}, Tokens: ${req.user.remaining_tokens?.toLocaleString()}, Email verified: ${serverEmailVerified} (server-verified)`);
    } catch (error) {
      console.error('❌ Firebase authentication failed:', error);
      return res.status(401).json({
        error: 'Refresh or disconnect and connect again in the extension by clicking on the extension icon',
        code: 'USER_NOT_CONNECTED_(refresh_or_disconnect_and_connect_again)'
      });
    }
  }

  // Check token quota before processing (only if not system user)
  if (!req.user.isSystem && servicesReady.firebase) {
    try {
      const { allowed, reason, userData } = await firebaseService.canUserMakeRequest(
        req.user.uid, 
        10000
      );

      if (!allowed) {
        requestStats.tokenQuotaBlocked++;
        
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
            errorResponse.message = 'You have reached the free limit. Upgrade to Pro to continue.';
            errorResponse.action = 'upgrade_to_pro';
            break;
          
          case 'PRO_LIMIT_EXCEEDED':
            errorResponse.message = 'Pro quota reached. Enable Usage-Based Spending?';
            errorResponse.action = 'enable_usage_based';
            errorResponse.options = [20, 50, 100]; // USD spending limits
            break;
          
          case 'USAGE_LIMIT_EXCEEDED':
            errorResponse.message = 'Usage-based budget exhausted. Increase the limit?';
            errorResponse.action = 'increase_usage_limit';
            break;
          
          default:
            errorResponse.message = 'Insufficient quota for this request.';
        }

        return res.status(429).json(errorResponse);
      }

      // Attach updated user data to request
      req.user = { ...req.user, ...userData };
      console.log('✅ Quota check passed for user plan:', req.user.plan);
      
    } catch (quotaError) {
      console.error('❌ Token quota check error:', quotaError);
      return res.status(500).json({
        error: 'Error checking token quota',
        code: 'QUOTA_CHECK_ERROR'
      });
    }
  }

  const startTime = Date.now();
  requestStats.total++;
  
  console.log(`\n🚀 === WORKFLOW RAG REQUEST ${requestStats.total} ===`);
  console.log('📊 Current stats:', requestStats);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('👤 User:', req.user.isSystem ? 'SYSTEM' : `${req.user.uid} (${req.user.plan})`);
  if (!req.user.isSystem) {
    console.log('🎯 Remaining tokens:', req.user.remaining_tokens?.toLocaleString() || 'N/A');
  }

  // 📊 DETAILED LOGGING - Request inspection
  console.log('\n%c📊 BACKEND: Incoming request analysis', 'background: darkred; color: white; padding: 2px 6px;');
  console.log('🔍 Method:', req.method);
  console.log('🔑 Authorization header present:', !!req.headers.authorization);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  // Analyser le body de la requête
  console.log('\n%c📦 BACKEND: Request body analysis', 'background: darkblue; color: white; padding: 2px 6px;');
  const rawBodySize = JSON.stringify(req.body).length;
  console.log('📏 Raw body size:', rawBodySize, 'chars (', (rawBodySize / 1024).toFixed(1), 'KB)');
  console.log('🔧 Body keys:', Object.keys(req.body));
  
  try {
    const { prompt, baseWorkflow } = req.body;

    // 📊 DETAILED LOGGING - Request payload inspection
    console.log('\n%c🔍 BACKEND: Payload inspection', 'background: purple; color: white; padding: 2px 6px;');
    console.log('📝 Prompt received:');
    console.log('  - Type:', typeof prompt);
    console.log('  - Length:', prompt?.length || 0, 'chars');
    console.log('  - Content:', prompt ? `"${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}"` : 'null');
    
    console.log('🔄 Base workflow analysis:');
    if (baseWorkflow) {
      console.log('  - Base workflow PROVIDED: YES');
      console.log('  - Type:', typeof baseWorkflow);
      console.log('  - Keys:', Object.keys(baseWorkflow));
      console.log('  - Nodes count:', baseWorkflow.nodes?.length || 0);
      console.log('  - Connections count:', Object.keys(baseWorkflow.connections || {}).length);
      console.log('  - Workflow name:', baseWorkflow.name);
      console.log('  - Workflow ID:', baseWorkflow.id);
      
      if (baseWorkflow.nodes && baseWorkflow.nodes.length > 0) {
        console.log('  - Node details:');
        baseWorkflow.nodes.forEach((node, i) => {
          console.log(`    ${i + 1}. ${node.name} (${node.type}) - ID: ${node.id}`);
        });
      }
      
      const baseWorkflowSize = JSON.stringify(baseWorkflow).length;
      console.log('  - Base workflow size:', baseWorkflowSize, 'chars (', (baseWorkflowSize / 1024).toFixed(1), 'KB)');
    } else {
      console.log('  - Base workflow PROVIDED: NO');
    }

    // Mode detection logic
    const isImprovementMode = baseWorkflow && baseWorkflow.nodes && baseWorkflow.nodes.length > 0;
    console.log('\n%c🎯 BACKEND: Mode detection', 'background: darkgreen; color: white; padding: 2px 6px;');
    console.log('🔧 Detected mode:', isImprovementMode ? 'IMPROVEMENT' : 'GENERATION');
    console.log('📋 Reasoning:');
    console.log('  - baseWorkflow exists:', !!baseWorkflow);
    console.log('  - baseWorkflow.nodes exists:', !!(baseWorkflow?.nodes));
    console.log('  - baseWorkflow.nodes.length:', baseWorkflow?.nodes?.length || 0);
    console.log('  - Final decision:', isImprovementMode ? 'Will improve existing workflow' : 'Will generate new workflow');

    if (!prompt || typeof prompt !== 'string') {
      console.log('❌ Missing or invalid prompt');
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    console.log('📝 Received prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    if (baseWorkflow) {
      console.log('🔄 Improvement mode detected, existing workflow:', baseWorkflow.nodes?.length || 0, 'nodes');
    }

    // Configuration SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Pour Nginx

    // État de la session
    let sessionState = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime,
      stage: 'init',
      workflowSize: 0,
      transmissionType: 'unknown',
      mode: isImprovementMode ? 'improvement' : 'generation'
    };

    console.log(`🔑 Session created: ${sessionState.id} (mode: ${sessionState.mode})`);

    // Fonction helper pour envoyer les événements SSE
    const sendSSE = (type, data) => {
      const payload = JSON.stringify({ type, data });
      console.log(`📡 SSE [${sessionState.id}] ${type}:`, data.message || data.stage || 'event');
      
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (writeError) {
        console.error('❌ Erreur écriture SSE:', writeError.message);
        throw writeError;
      }
    };

    // Callback de progression avec monitoring
    const onProgress = (stage, data) => {
      sessionState.stage = stage;
      
      // Logging détaillé selon le stage
      switch (stage) {
        case 'search':
          console.log(`🔍 [${sessionState.id}] Search: ${data.message}`);
          break;
        case 'context_building':
          console.log(`🏗️ [${sessionState.id}] Context: ${data.workflows?.length || 0} workflows`);
          break;
        case 'claude_call':
          console.log(`🤖 [${sessionState.id}] Claude: ${data.promptLength} chars`);
          break;
        case 'compression':
          console.log(`🗜️ [${sessionState.id}] Compression: ${data.nodesCount} nodes`);
          break;
        case 'chunking_start':
          console.log(`📦 [${sessionState.id}] Chunking: ${data.totalChunks} parts`);
          requestStats.chunkingUsed++;
          sessionState.transmissionType = 'chunked';
          break;
        case 'compressed_complete':
          console.log(`✅ [${sessionState.id}] Compressed sent`);
          requestStats.compressionUsed++;
          sessionState.transmissionType = 'compressed';
          break;
        case 'error':
          console.error(`❌ [${sessionState.id}] Error:`, data.message || data.error);
          break;
      }
      
      sendSSE(stage, data);
    };

    // Initialiser le service RAG
    sendSSE('setup', { message: 'Initializing AI workflow generator... This may take several minutes.' });
    sessionState.stage = 'setup';

    const ragService = createWorkflowRAGService();
    console.log(`✅ [${sessionState.id}] Service RAG initialized`);

    // 📊 DETAILED LOGGING - RAG service call preparation
    console.log('\n%c🤖 BACKEND: RAG service call preparation', 'background: darkviolet; color: white; padding: 2px 6px;');
    console.log('🔧 Calling generateWorkflowFromExamplesWithStreaming with:');
    console.log('  - prompt:', prompt.substring(0, 100) + '...');
    console.log('  - topK: 3');
    console.log('  - workflowName: "Generated Workflow"');
    console.log('  - baseWorkflow:', baseWorkflow ? 'PROVIDED' : 'null');
    console.log('  - onProgress: callback function provided');

    // Générer le workflow avec monitoring
    const result = await ragService.generateWorkflowFromExamplesWithStreaming(
      prompt,
      {
        topK: 3,
        workflowName: 'Generated Workflow',
        baseWorkflow,
        onProgress
      }
    );

    // Calculer les statistiques
    const duration = Date.now() - startTime;
    const workflowJson = JSON.stringify(result.workflow || {});
    sessionState.workflowSize = Buffer.byteLength(workflowJson, 'utf8');

    // Déterminer si c'est un gros workflow
    const isLargeWorkflow = sessionState.workflowSize > 50000; // 50KB
    if (isLargeWorkflow) {
      requestStats.largeWorkflows++;
    }

    console.log(`\n📈 === SESSION COMPLETE ${sessionState.id} ===`);
    console.log(`⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📏 Workflow size: ${(sessionState.workflowSize / 1024).toFixed(1)}KB`);
    console.log(`🔄 Transmission type: ${sessionState.transmissionType}`);
    console.log(`🎯 Success: ${result.success}`);
    console.log(`📊 Nodes: ${result.workflow?.nodes?.length || 0}`);
    console.log(`🔧 Mode: ${sessionState.mode}`);

    if (result.success) {
      requestStats.success++;

      // Report token usage for billing (only if Firebase is available)
      if (!req.user.isSystem && result.tokensUsed && servicesReady.firebase) {
        try {
          sendSSE('reporting_usage', { 
            message: 'Updating user quota...',
            tokensUsed: result.tokensUsed.input
          });

          await firebaseService.updateUserTokens(
            req.user.uid, 
            result.tokensUsed.input, 
            result.tokensUsed.output || 0
          );

          // ---------- NEW: immediate charge if spending limit reached ----------
          if (req.user.usage_based_enabled && req.user.plan === 'PRO') {
            const freshUser = await firebaseService.getOrCreateUser(req.user.uid);
            const limit = freshUser.usage_limit_usd || 0;
            const usageUsd = freshUser.this_month_usage_usd || 0;
            if (limit > 0 && usageUsd >= limit) {
              console.log(`💳 User ${req.user.uid} reached spending limit $${limit}. Charging now...`);
              await stripeService.chargeUsageNow(freshUser.stripe_customer_id, usageUsd, 'Pay-as-you-go usage');
              await firebaseService.incrementPaidUsage(req.user.uid, usageUsd);
              await firebaseService.resetUsageBudget(req.user.uid);
            }
          }

          // Report to Stripe if PRO user with usage-based billing
          if (servicesReady.stripe && req.user.plan === 'PRO' && req.user.stripe_customer_id) {
            const updatedUser = await firebaseService.getOrCreateUser(req.user.uid);
            
            if (updatedUser.remaining_tokens === 0 && updatedUser.usage_based_enabled) {
              await stripeService.reportUsage(req.user.stripe_customer_id, result.tokensUsed.input);
              console.log(`📊 Reported usage to Stripe for user ${req.user.uid}`);
            }
          }

          // Log usage event for analytics
          await firebaseService.logUsageEvent(req.user.uid, 'workflow_generation', {
            input_tokens: result.tokensUsed.input,
            output_tokens: result.tokensUsed.output || 0,
            workflow_size: sessionState.workflowSize,
            mode: sessionState.mode,
            duration: duration,
            user_prompt: prompt, // Store the original user prompt
            ai_context_sources: result.similarWorkflows || [],
            ai_context_files: result.similarWorkflowFiles || []
          });

          console.log(`📊 [${sessionState.id}] Usage reported for user ${req.user.uid}`);
        } catch (usageError) {
          console.error(`❌ Usage reporting error:`, usageError.message);
          // Don't fail the request for usage reporting errors
        }
      } else if (!req.user.isSystem && result.tokensUsed && !servicesReady.firebase) {
        console.log(`⚠️ [${sessionState.id}] Usage not reported (Firebase unavailable)`);
      }
      
      // Log final de succès
      sendSSE('session_complete', {
        message: 'Workflow generation completed successfully',
        duration: duration,
        workflowSize: sessionState.workflowSize,
        transmissionType: result.transmissionType || sessionState.transmissionType,
        mode: sessionState.mode,
        tokensUsed: result.tokensUsed,
        stats: {
          nodes: result.workflow?.nodes?.length || 0,
          connections: Object.keys(result.workflow?.connections || {}).length
        }
      });
    } else {
      requestStats.errors++;
      console.error(`❌ [${sessionState.id}] Failed:`, result.error);
      
      sendSSE('error', {
        error: result.error,
        sessionId: sessionState.id
      });
    }

  } catch (error) {
    requestStats.errors++;
    console.error('\n❌ === CRITICAL ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Timestamp:', new Date().toISOString());
    
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        data: {
          error: `Server error: ${error.message}`,
          timestamp: new Date().toISOString(),
          code: 'INTERNAL_ERROR'
        }
      })}\n\n`);
    } catch (writeError) {
      console.error('❌ Unable to send SSE error:', writeError.message);
    }
  } finally {
    try {
      res.end();
    } catch (endError) {
      console.error('❌ Connection close error:', endError.message);
    }
    
    console.log(`\n📊 === GLOBAL STATS ===`);
    console.log(`Total requests: ${requestStats.total}`);
    console.log(`Success: ${requestStats.success} (${(requestStats.success/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Errors: ${requestStats.errors} (${(requestStats.errors/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Quota blocked: ${requestStats.tokenQuotaBlocked} (${(requestStats.tokenQuotaBlocked/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Large workflows: ${requestStats.largeWorkflows}`);
    console.log(`Compression used: ${requestStats.compressionUsed}`);
    console.log(`Chunking used: ${requestStats.chunkingUsed}`);
  }
} 