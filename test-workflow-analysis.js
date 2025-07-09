// Analyse du workflow généré par Claude

const workflow = {
  "name": "Gmail to Slack - Maxime Notifications",
  "nodes": [
    {
      "parameters": {
        "content": "## Configuration requise\n\n1. **Gmail** : Connectez votre compte minfreestyle@gmail.com\n2. **Slack** : Connectez votre workspace Slack\n3. **Channel** : Remplacez #general par le canal de votre choix\n\nLe workflow filtre automatiquement les emails de maxime.marsal18@gmail.com",
        "height": 200,
        "width": 300
      },
      "id": "note_1",
      "name": "Configuration Info",
      "type": "n8n-nodes-base.stickyNote",
      "typeVersion": 1,
      "position": [250, 100]
    },
    {
      "parameters": {
        "pollTimes": {
          "item": [
            {
              "mode": "everyMinute"
            }
          ]
        },
        "simple": false,
        "filters": {}
      },
      "id": "gmail_trigger",
      "name": "Gmail Trigger",
      "type": "n8n-nodes-base.gmailTrigger",
      "typeVersion": 1,
      "position": [400, 300],
      "credentials": {
        "gmailOAuth2": {
          "id": "1",
          "name": "Gmail account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json[\"from\"][\"value\"][0][\"address\"]}}",
              "operation": "equals",
              "value2": "maxime.marsal18@gmail.com"
            }
          ]
        }
      },
      "id": "if_node",
      "name": "Check if from Maxime",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [600, 300]
    },
    {
      "parameters": {
        "channel": "#general",
        "text": "=📧 **Nouveau mail de Maxime**\n\n**Sujet:** {{$node[\"Gmail Trigger\"].json[\"subject\"]}}\n\n**Message:**\n{{$node[\"Gmail Trigger\"].json[\"text\"]}}\n\n**Date:** {{$node[\"Gmail Trigger\"].json[\"date\"]}}",
        "otherOptions": {}
      },
      "id": "slack_node",
      "name": "Send to Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [800, 250],
      "credentials": {
        "slackApi": {
          "id": "2",
          "name": "Slack account"
        }
      }
    },
    {
      "parameters": {},
      "id": "no_op",
      "name": "Not from Maxime",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [800, 350]
    }
  ],
  "connections": {
    "Gmail Trigger": {
      "main": [
        [
          {
            "node": "Check if from Maxime",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check if from Maxime": {
      "main": [
        [
          {
            "node": "Send to Slack",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Not from Maxime",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {},
  "id": "gmail_slack_maxime",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
};

console.log('🔍 Analyse du workflow Gmail → Slack\n');

const prompt = "fais moi un workflow qui fais que quand maxime.marsal18@gmail.com m'envoi un mail sur ma boite gmail minfreestyle@gmail.com ça m'envoi un message sur slack avec son contenu";

console.log('📝 Prompt utilisateur:');
console.log(`"${prompt}"\n`);

console.log('🤔 Analyse des besoins:\n');

console.log('1. DÉCLENCHEUR:');
console.log('   - Gmail Trigger: Surveille les nouveaux emails');
console.log('   - Boîte email: minfreestyle@gmail.com');

console.log('\n2. CONDITION (IF nécessaire ?):');
console.log('   - Filtrer par expéditeur: maxime.marsal18@gmail.com');
console.log('   - ❓ Option A: Utiliser un node IF pour filtrer');
console.log('   - ❓ Option B: Utiliser les filtres du Gmail Trigger');

console.log('\n3. ACTION:');
console.log('   - Envoyer le contenu sur Slack');

console.log('\n📊 Comparaison des approches:\n');

console.log('APPROCHE 1: Avec node IF (3 nodes)');
console.log('  [Gmail Trigger] → [IF: from == maxime.marsal18] → [Slack]');
console.log('  ✅ Plus flexible pour des conditions complexes');
console.log('  ❌ Plus de nodes, plus complexe');
console.log('  ❌ Tous les emails sont récupérés puis filtrés');

console.log('\nAPPROCHE 2: Sans node IF (2 nodes)');
console.log('  [Gmail Trigger avec filters.from] → [Slack]');
console.log('  ✅ Plus simple et efficace');
console.log('  ✅ Seuls les emails de Maxime sont traités');
console.log('  ✅ Moins de ressources utilisées');

console.log('\n💡 RECOMMANDATION:');
console.log('Pour ce cas simple, utiliser les filtres du Gmail Trigger est préférable.');
console.log('Le node IF n\'est pas nécessaire car Gmail Trigger peut filtrer directement.');

console.log('\n🎯 Nodes nécessaires:');
console.log('1. gmailTrigger (avec filters.from configuré)');
console.log('2. slack');
console.log('\nTotal: 2 nodes suffisent !');

console.log('\n📌 Quand utiliser un node IF:');
console.log('- Conditions multiples complexes');
console.log('- Logique qui combine plusieurs champs');
console.log('- Besoin de router vers différentes branches');
console.log('- Conditions qui changent dynamiquement'); 