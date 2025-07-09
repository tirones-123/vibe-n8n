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

console.log('🔍 Analyse du workflow généré par Claude\n');

// Analyser chaque node
workflow.nodes.forEach(node => {
  console.log(`\n📌 Node: ${node.name} (${node.type})`);
  console.log(`   Version: ${node.typeVersion}`);
  console.log(`   Paramètres:`, JSON.stringify(node.parameters, null, 2));
  
  // Identifier les problèmes potentiels
  if (node.type === 'n8n-nodes-base.gmailTrigger') {
    console.log('\n   ⚠️  Problèmes potentiels pour Gmail Trigger:');
    console.log('   - "simple" devrait peut-être être true');
    console.log('   - "filters" est vide - pourrait causer l\'erreur');
  }
  
  if (node.type === 'n8n-nodes-base.if') {
    console.log('\n   ⚠️  Problèmes potentiels pour IF:');
    console.log('   - "operation": "equals" pourrait ne pas être supporté');
    console.log('   - Essayer "equal" au lieu de "equals"');
  }
  
  if (node.type === 'n8n-nodes-base.slack') {
    console.log('\n   ⚠️  Problèmes potentiels pour Slack:');
    console.log('   - Le node Slack v2 pourrait avoir besoin de "resource" et "operation"');
    console.log('   - Structure actuelle pourrait être pour v1');
  }
});

console.log('\n\n🔧 Corrections suggérées:\n');

// Créer une version corrigée
const correctedWorkflow = JSON.parse(JSON.stringify(workflow));

// Corriger Gmail Trigger
const gmailNode = correctedWorkflow.nodes.find(n => n.type === 'n8n-nodes-base.gmailTrigger');
if (gmailNode) {
  gmailNode.parameters.simple = true;
  delete gmailNode.parameters.filters; // Supprimer si vide
  console.log('✅ Gmail Trigger: Mis simple=true et supprimé filters vide');
}

// Corriger IF node
const ifNode = correctedWorkflow.nodes.find(n => n.type === 'n8n-nodes-base.if');
if (ifNode) {
  ifNode.parameters.conditions.string[0].operation = 'equal'; // "equal" au lieu de "equals"
  console.log('✅ IF Node: Changé "equals" en "equal"');
}

// Corriger Slack node pour v2
const slackNode = correctedWorkflow.nodes.find(n => n.type === 'n8n-nodes-base.slack');
if (slackNode) {
  slackNode.parameters = {
    resource: 'message',
    operation: 'post',
    channel: '#general',
    text: slackNode.parameters.text,
    otherOptions: {}
  };
  console.log('✅ Slack Node: Ajouté resource et operation pour v2');
}

console.log('\n\n📄 Workflow corrigé:\n');
console.log(JSON.stringify(correctedWorkflow, null, 2)); 