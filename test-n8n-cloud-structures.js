// Test des structures valides pour n8n Cloud

console.log('🔍 Analyse des structures valides pour n8n Cloud\n');

// Structure générée par Claude (qui cause des erreurs)
const claudeWorkflow = {
  gmailTrigger: {
    "parameters": {
      "pollTimes": {
        "item": [{ "mode": "everyMinute" }]
      },
      "simple": false,
      "filters": {}  // ❌ Objet vide cause l'erreur
    }
  },
  ifNode: {
    "parameters": {
      "conditions": {
        "string": [{
          "value1": "={{$json[\"from\"][\"value\"][0][\"address\"]}}",
          "operation": "equals",  // ❌ "equals" n'existe pas
          "value2": "maxime.marsal18@gmail.com"
        }]
      }
    }
  },
  slackNode: {
    "parameters": {
      "channel": "#general",
      "text": "Message",
      "otherOptions": {}  // ❌ Structure v1 pour un node v2
    }
  }
};

// Structures correctes pour n8n Cloud
const correctWorkflow = {
  gmailTrigger: {
    "parameters": {
      "pollTimes": {
        "item": [{ "mode": "everyMinute" }]
      },
      "simple": true,
      "options": {}  // ✅ Ou simplement omettre si pas d'options
    }
  },
  ifNodeV1: {
    "parameters": {
      "conditions": {
        "string": [{
          "value1": "={{$json[\"from\"][\"value\"][0][\"address\"]}}",
          "operation": "equal",  // ✅ "equal" pas "equals"
          "value2": "maxime.marsal18@gmail.com"
        }]
      }
    }
  },
  ifNodeV2: {
    "parameters": {
      "conditions": {
        "conditions": [
          {
            "leftValue": "={{ $json.from.value[0].address }}",
            "rightValue": "maxime.marsal18@gmail.com",
            "operator": {
              "type": "string",
              "operation": "equals"  // ✅ Pour v2, c'est "equals" !
            }
          }
        ]
      }
    }
  },
  slackNodeV2: {
    "parameters": {
      "resource": "message",  // ✅ Requis pour v2
      "operation": "post",    // ✅ Requis pour v2
      "channel": "#general",
      "text": "Message",
      "otherOptions": {}
    }
  }
};

console.log('❌ Structures qui causent des erreurs:');
console.log(JSON.stringify(claudeWorkflow, null, 2));

console.log('\n\n✅ Structures correctes:');
console.log(JSON.stringify(correctWorkflow, null, 2));

console.log('\n\n📌 Points clés:');
console.log('1. Gmail Trigger: Ne pas mettre "filters: {}" vide');
console.log('2. IF v1: Utilise "operation": "equal" (sans s)');
console.log('3. IF v2.2: Utilise une structure complètement différente avec operator.operation: "equals"');
console.log('4. Slack v2: DOIT avoir "resource" et "operation"');
console.log('5. n8n Cloud utilise probablement IF v1 par défaut car typeVersion: 1'); 