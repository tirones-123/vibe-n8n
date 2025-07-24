# `content.js` – Detailed Walkthrough

> This document gives a high-level and section-by-section explanation of how the Chrome extension’s **content script** works.  
> Each bullet lists the **purpose**, **key ideas**, and the **approximate line range** inside `vibe-n8n-chrome-extension/src/content.js` so you can jump straight to the code.

---

## 1. File Header & Globals  
*Lines 1 - 25*
*   Declares the script purpose and sets up **global variables** such as `contentAuthIntegration`.  
*   No logic yet – just comments & variable placeholders.

---

## 2. Utility – `waitForGlobalObject`  
*Lines 26 - 57*
*   Async helper that polls `window[objectName]` until it becomes available or times out.
*   Used later to wait for Firebase SDK/objects injected by background scripts.

```30:54:vibe-n8n-chrome-extension/src/content.js
function waitForGlobalObject(objectName, maxAttempts = 10, interval = 100) {
  return new Promise((resolve, reject) => {
    /* … polling logic … */
  });
}
```

---

## 3. Debug / QA helpers – `exposeTestFunctions()`  
*Lines 60 - 165*
*   Publishes many **testing utilities** on `window.*` (e.g. `testFirebaseSystem`, `showFirebaseAuthModal`, `createTestUser`).
*   Provides an easy way to inspect auth status, create demo users, etc. directly from DevTools.

---

## 4. Firebase Initialisation – `initializeFirebaseAuth()`  
*Lines 170 - 260*
*   Waits for `contentAuthIntegration`, then calls its `initialize()`.*
*   Exposes both `contentAuthIntegration` and its `authService` globally.
*   Returns **true/false** for success; errors are shown in console.

---

## 5. Quick visual banner  
*Lines 265 - 290*
*   Immediately injects a little green ✔️ “AI Assistant Loaded” badge for 2 s so users know the script ran.

---

## 6. Duplicate-injection guard  
*Lines 293 - 305*
*   Simple IIFE sets `window.n8nAIAssistantLoaded` to prevent double execution when content scripts get injected twice.

---

## 7. n8n Page Detection Helpers  
*Lines 310 - 410*
*   `detectN8nPage()` plus async `checkSavedDomains()` figure out whether the current tab hosts an n8n editor.
*   Allows auto-activation on user-saved custom domains.

---

## 8. **Main bootstrap IIFE** – `initializeExtension()`  
*Starts ~Line 420 – continues for the rest of the file*
This monster function wires everything together.  Key subsections:

| Section | Approx. lines | What it does |
|---|---|---|
| 8.1 Saved-domain auto-activation | 430-465 | Reads `chrome.storage.sync` to see if host should auto-start the assistant. |
| 8.2 Panel state variables           | 470-525 | Declares UI state flags – open/closed, widths, etc. |
| 8.3 Width helpers (`getOptimalPanelWidth`, `updatePanelWidth`) | 530-575 | Calculates responsive panel width & persists it in `localStorage`. |
| 8.4 **CSS Injection** – `injectStyles()` | 580-810 | Generates a giant `<style>` string with CSS variables, scrollbar styling, dark-/light-theme colors, etc. |
| 8.5 **Layout detection** – `detectAndModifyN8nLayout()` | 820-1080 | Finds the main n8n container(s) and shrinks them so the side panel can live beside the canvas without breaking the editor. |
| 8.6 Apply / remove layout helpers   | 1080-1180 | `applyN8nLayoutModifications()` & `removeN8nLayoutModifications()` manipulate those classes at runtime. |
| 8.7 **createInterface()**           | 1185-2000 | Builds the entire side panel DOM: header, chat area, collapsible JSON code panel, textarea + send button, horizontal/vertical resize handles, etc. |
| 8.8 Event-listener wiring – `setupEventListeners()` | 2005-2600 | Keyboard shortcuts, button clicks, paste watcher, resize logic, NDV detection, etc. |
| 8.9 UI toggles & resizers           | 2605-3000 | `toggleInterface`, `toggleCodePanel`, vertical & horizontal resize handlers. |
| 8.10 Node-Detail-View adaptation    | 3005-3210 | Shrinks the panel when n8n’s NDV is open, restores size after closing. |
| 8.11 **Theme detection**            | 3215-3520 | Heuristics to guess n8n light/dark theme + `applyThemeColors()` updates CSS variables. |
| 8.12 Clipboard / copy JSON helpers  | 3525-3630 | `copyJsonToClipboard()` with visual feedback. |
| 8.13 Chat rendering utilities       | 3635-3770 | `addChatMessage`, `updateChatMessage` render messages in “Cursor-AI” style. |
| 8.14 Code-panel content & status    | 3775-3850 | `updateCodeContent`, syntax highlighting, progress indicators. |
| 8.15 Workflow import helpers        | 3855-3940 | `insertWorkflow`, `importWorkflow`, JSON cleaning & validation. |
| 8.16 Background-message handler     | 3945-4040 | `handleBackgroundMessage()` receives progress / results from `background.js` (RAG streaming, errors, etc.). |
| 8.17 Decompression fallback         | 4045-4080 | Handles large compressed workflows via `DecompressionStream`. |
| 8.18 Final `init()` call & guards   | 4080-EOF  | Kicks everything off once DOM is ready, sets up resize/theme observers, exposes debug fns. |

---

## 9. Global Debug Shortcuts  
Throughout sections (see `exposeTestFunctions()` and bottom of file), many helpers like `testFirebaseSystem()` are attached to `window` so developers can type them in DevTools.

---

## 10. Communication Flow (Quick Recap)
1. **User opens panel** → `toggleInterface()` applies layout & shows side panel.  
2. **User writes prompt & hits Send** → `sendMessage()` (≈ line 2400) collects existing workflow (if any) & forwards a payload to `background.js` via `chrome.runtime.sendMessage`.  
3. **background.js** streams progress events (search, building, complete) back to content-script which **updates UI** in `handleBackgroundMessage()`.  
4. When the backend returns the final JSON, the code panel shows it and (optionally) auto-imports it into n8n via `inject.js` simulation.

---

### Need the raw code?
Use the line numbers above with your editor’s “Go to line” feature or click on the citations in this file.

---

*Generated automatically by AI based on commit snapshot on* `{{DATE}}`. 