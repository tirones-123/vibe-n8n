# 🔒 Security Fixes Required - Chrome Extension

## 🚨 CRITICAL - XSS Prevention

### Replace innerHTML usage (20+ instances)

**Current (unsafe):**
```javascript
modal.innerHTML = content;
copyButton.innerHTML = `<svg>...`;
messageElement.innerHTML = createQuotaExceededCard(quotaInfo);
```

**Fixed (safe):**
```javascript
// Option 1: Use textContent for text
modal.textContent = content;

// Option 2: Use createElement for HTML
const svg = document.createElement('div');
svg.innerHTML = `<svg>...</svg>`; // Only for trusted static content
copyButton.appendChild(svg.firstChild);

// Option 3: Use a secure template system
function createSecureElement(tag, attrs, children) {
  const element = document.createElement(tag);
  if (attrs) Object.assign(element, attrs);
  if (children) children.forEach(child => element.appendChild(child));
  return element;
}
```

## 🔐 CRITICAL - Remove exposed API keys

### Move sensitive config to backend

**Current (unsafe):**
```javascript
// vibe-n8n-chrome-extension/src/config.js
LEGACY_API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
FIREBASE_CONFIG: {
  apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
  // ...
}
```

**Fixed (safe):**
```javascript
// vibe-n8n-chrome-extension/src/config.js
const CONFIG = {
  API_URL: 'https://vibe-n8n.com/api/claude',
  API_BASE_URL: 'https://vibe-n8n.com',
  VERSION: '1.0.0',
  // NO API KEYS - backend handles all auth
  
  ENDPOINTS: {
    CLAUDE: '/api/claude',
    USER_INFO: '/api/me',
    // ...
  }
};

// Backend should expose public Firebase config via API
// GET /api/firebase-config -> { apiKey, authDomain, ... }
```

## 📱 MEDIUM - Improve data storage

### Use Chrome Storage API instead of localStorage

**Current:**
```javascript
localStorage.setItem('n8n-ai-panel-width', width);
const savedWidth = localStorage.getItem('n8n-ai-panel-width');
```

**Fixed:**
```javascript
// Secure storage with sync across devices
await chrome.storage.sync.set({ 'n8n-ai-panel-width': width });
const result = await chrome.storage.sync.get(['n8n-ai-panel-width']);
const savedWidth = result['n8n-ai-panel-width'];
```

## 🛡️ Content Security Policy improvements

### Tighten CSP rules

**Current:**
```json
"content_security_policy": {
  "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline';"
}
```

**Improved:**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; frame-src 'none';",
  "sandbox": "sandbox allow-scripts allow-forms; script-src 'self';"
}
```

## 🔍 Input validation improvements

### Add comprehensive sanitization

```javascript
// Add to content.js
function sanitizeUserInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

// Use before any innerHTML or API calls
const safePrompt = sanitizeUserInput(userInput);
```

## 🚀 Implementation Priority

1. **IMMEDIATE** - Remove API keys from config.js
2. **IMMEDIATE** - Replace all innerHTML with safe alternatives  
3. **WEEK 1** - Implement Chrome Storage API
4. **WEEK 2** - Add input sanitization
5. **WEEK 3** - Tighten CSP rules

## 📋 Testing checklist

- [ ] No API keys in extension files
- [ ] No innerHTML usage with user content
- [ ] Chrome Storage API working
- [ ] CSP violations checked in DevTools
- [ ] Manual XSS testing performed
- [ ] Extension passes Chrome Web Store review

---

*Implement these fixes before submitting to Chrome Web Store* 