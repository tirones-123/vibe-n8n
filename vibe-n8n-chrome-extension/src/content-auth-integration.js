/**
 * Integration module for Firebase Authentication in the existing content.js
 * This module handles authentication before workflow generation
 */

import authService from './auth.js';
import authUI from './auth-ui.js';
import CONFIG from './config.js';

class ContentAuthIntegration {
  constructor() {
    this.initialized = false;
    this.authRequired = false; // Will be true once Firebase is ready
  }

  // Initialize authentication system
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔐 Initializing authentication system...');
      
      // Initialize Firebase Auth UI
      await authUI.initialize();
      
      // Listen for auth state changes
      authService.onAuthStateChanged((user, token) => {
        if (user) {
          console.log('✅ User authenticated:', user.email);
          this.updateUIForAuthenticatedUser();
        } else {
          console.log('❌ User not authenticated');
          this.updateUIForUnauthenticatedUser();
        }
      });

      this.initialized = true;
      this.authRequired = true; // Now require auth for new users
      
      console.log('✅ Authentication system initialized');
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      // Fallback to legacy mode if Firebase fails
      this.authRequired = false;
    }
  }

  // Check if user can make a request
  async canMakeRequest() {
    if (!this.authRequired) {
      // Legacy mode - always allow
      return { allowed: true, method: 'legacy' };
    }

    if (!authService.isAuthenticated()) {
      return { 
        allowed: false, 
        reason: 'NOT_AUTHENTICATED',
        action: 'show_auth_modal'
      };
    }

    // Check quota with backend
    try {
      const response = await authService.makeAuthenticatedRequest(
        `${CONFIG.API_URL}${CONFIG.ENDPOINTS.USER_INFO}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          const error = await response.json();
          return {
            allowed: false,
            reason: error.code,
            data: error,
            action: 'show_quota_popup'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const userInfo = await response.json();
      return { 
        allowed: userInfo.quota.can_make_request,
        method: 'firebase',
        userInfo
      };

    } catch (error) {
      console.error('❌ Error checking user quota:', error);
      return { 
        allowed: false, 
        reason: 'API_ERROR',
        action: 'show_error'
      };
    }
  }

  // Handle quota/auth errors
  handleAccessDenied(checkResult) {
    switch (checkResult.action) {
      case 'show_auth_modal':
        authUI.showAuthModal();
        break;
      
      case 'show_quota_popup':
        const popup = authUI.createQuotaExceededPopup(checkResult.data);
        document.body.appendChild(popup);
        break;
      
      case 'show_error':
        this.showErrorMessage('Erreur de connexion. Réessayez plus tard.');
        break;
    }
  }

  // Make authenticated request (replaces the old sendMessage for API calls)
  async makeWorkflowRequest(prompt, baseWorkflow = null) {
    const checkResult = await this.canMakeRequest();
    
    if (!checkResult.allowed) {
      this.handleAccessDenied(checkResult);
      return null;
    }

    const endpoint = `${CONFIG.API_URL}${CONFIG.ENDPOINTS.CLAUDE}`;
    const payload = { prompt };
    
    if (baseWorkflow) {
      payload.baseWorkflow = baseWorkflow;
    }

    try {
      let response;
      
      if (checkResult.method === 'legacy') {
        // Use legacy API key
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.LEGACY_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Use Firebase authentication
        response = await authService.makeAuthenticatedRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      // Handle quota errors
      if (response.status === 429) {
        const error = await response.json();
        this.handleAccessDenied({ 
          allowed: false,
          action: 'show_quota_popup',
          data: error
        });
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Report usage for authenticated users
      if (checkResult.method === 'firebase') {
        this.reportUsageAfterRequest(response);
      }

      return response;

    } catch (error) {
      console.error('❌ Workflow request failed:', error);
      this.showErrorMessage('Erreur lors de la génération. Réessayez.');
      return null;
    }
  }

  // Report usage after successful request
  async reportUsageAfterRequest(response) {
    try {
      // Try to extract token usage from response headers or body
      const tokensUsed = this.extractTokenUsage(response);
      
      if (tokensUsed) {
        await authService.makeAuthenticatedRequest(
          `${CONFIG.API_URL}${CONFIG.ENDPOINTS.REPORT_USAGE}`,
          {
            method: 'POST',
            body: JSON.stringify({
              input_tokens: tokensUsed.input,
              output_tokens: tokensUsed.output || 0
            })
          }
        );
      }
    } catch (error) {
      console.error('❌ Failed to report usage:', error);
      // Don't fail the main request for usage reporting errors
    }
  }

  // Extract token usage from response (SSE or final response)
  extractTokenUsage(response) {
    // This will be implemented based on how the backend sends token info
    // For now, return null (usage will be tracked server-side)
    return null;
  }

  // Update UI for authenticated user
  updateUIForAuthenticatedUser() {
    // Add user info to the chat panel header if it exists
    const chatHeader = document.querySelector('.vibe-chat-header');
    if (chatHeader && !chatHeader.querySelector('.user-section')) {
      authUI.updateChatHeader(true);
    }
  }

  // Update UI for unauthenticated user
  updateUIForUnauthenticatedUser() {
    const chatHeader = document.querySelector('.vibe-chat-header');
    if (chatHeader) {
      authUI.updateChatHeader(false);
    }
  }

  // Show error message
  showErrorMessage(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'vibe-error-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Get current authentication status for UI updates
  getAuthStatus() {
    return {
      isRequired: this.authRequired,
      isAuthenticated: authService.isAuthenticated(),
      currentUser: authService.getCurrentUser()
    };
  }
}

// Create and export singleton instance
const contentAuthIntegration = new ContentAuthIntegration();

// Auto-initialize when this module is loaded
contentAuthIntegration.initialize().catch(error => {
  console.error('❌ Failed to initialize auth integration:', error);
});

export default contentAuthIntegration; 