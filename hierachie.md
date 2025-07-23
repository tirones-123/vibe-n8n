tous est envoyé sur git qui est ensuite déployé sur railway ici vibe-n8n-production.up.railway.app

uniquement vibe-n8n-chrome-extension/ est upload dans chrome comme extension

cursor-n8n-backend/
├── 📄 Fichiers de configuration principaux
│   ├── server.js                           # Serveur principal (6.1KB)
│   ├── package.json                        # Dépendances npm
│   ├── package-lock.json                   # Lock des dépendances (178KB)
│   ├── env.example                         # Variables d'environnement exemple
│   ├── railway.toml                        # Configuration Railway
│   └── .gitignore                          # Fichiers ignorés par Git
│
├── 🔧 API Backend
│   └── api/
│       ├── index.js                        # Point d'entrée API
│       ├── claude.js                       # Service Claude AI
│       ├── pricing.js                      # Gestion des prix
│       ├── middleware/
│       │   └── auth.js                     # Middleware d'authentification
│       ├── services/
│       │   ├── firebase-service.js         # Service Firebase
│       │   └── stripe-service.js           # Service Stripe
│       ├── rag/
│       │   └── workflow-rag-service.js     # Service RAG pour workflows
│       └── README.md
│
├── 🔐 Authentification Firebase
│   └── firebase-auth-site/
│       ├── index.html
│       ├── firebase-app.js
│       ├── firebase-auth-web-extension.js
│       └── signInWithPopup.js
│
├── 🌐 Extension Chrome
│   └── vibe-n8n-chrome-extension/
│       ├── manifest.json
│       ├── popup.html
│       ├── offscreen.html
│       ├── offscreen.js
│       ├── assets/                         # Icônes (16, 48, 128px)
│       ├── libs/
│       │   ├── firebase/
│       │   └── test/
│       ├── src/
│       │   ├── background.js
│       │   ├── config.js
│       │   ├── content-auth-integration-standalone.js
│       │   ├── content.js
│       │   └── [+3 autres fichiers JS]
│       ├── styles/
│       │   ├── auth.css
│       │   ├── panel.css
│       │   └── popup.css
│       └── README.md
│   └── vibe-n8n-chrome-extension.crx       # Extension compilée (1.5MB)
│
├── 🤖 Workflows n8n
│   ├── workflows/                          # Workflows originaux (1955 fichiers)
│   ├── workflows origine/                  # Sauvegarde workflows
│   ├── workflows-rag-optimized/           # Workflows optimisés (2055 fichiers)
│   └── workflow-descriptions/              # Descriptions des workflows
│       ├── failures-2025-07-17.json
│       ├── reindex-report-2025-07-17.json
│       └── workflow-descriptions-2025-07-17.json
│
├── 🛠️ Scripts et outils
│   └── scripts/
│       ├── analyze-optimized-workflows.js
│       ├── analyze-workflow-sizes.js
│       ├── empty-large-workflows.js
│       ├── ensure-mcp-db.js
│       ├── force-empty-workflows.js
│       ├── generate-workflow-descriptions.js
│       ├── log-to-file.js
│       ├── optimize-workflows-rag.js
│       ├── quick-test.js
│       ├── reindex-with-descriptions.js
│       ├── retry-failed-workflows.js
│       ├── test-creation-mode.js
│       ├── test-curl-with-logging.js
│       ├── test-large-workflow.js
│       ├── test-pinecone-indexing.js
│       ├── test-rag-optimized.js
│       ├── test-rag-system.js
│       ├── test-system.js
│       ├── update-node-types.js
│       ├── upgrade-rag-system.js
│       ├── view-logs.sh
│       └── watch-logs.js
│
├── 🧪 Tests et débogage
│   ├── debug/                              # Dossier de débogage
│   ├── test-creation-mode.sh
│   ├── test-pinecone-diagnostic.sh
│   ├── test-specific-workflow.sh
│   ├── test-streaming-curl.sh
│   ├── test-streaming-realtime.sh
│   └── test.txt
│
├── 📚 Documentation
│   ├── README.md                           # Documentation principale
│   ├── AUTHENTICATION_GUIDE.md            # Guide d'authentification
│   ├── PRICING_SETUP_GUIDE.md             # Guide de configuration des prix
│   ├── STREAMING_FEATURES.md              # Fonctionnalités de streaming
│   └── UPGRADE_RAG_GUIDE.md               # Guide de mise à jour RAG
│
├── 📊 Logs et données
│   ├── recent-logs.txt
│   ├── server.log
│   ├── debug-claude-prompt.json
│   ├── workflow-delete.txt
│   ├── gdhez.txt
│   └── statwork.txt
│
└── 🗂️ Archives
    └── old/
        └── node-types/                     # Types de nœuds archivés
            ├── doc-n8n/
            ├── node-types/ (732 fichiers JSON)
            └── [+3 fichiers JSON de timestamps]