import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'cron-debug.log');

export function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Écrire dans le fichier ET dans la console
  console.log(message);
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Erreur écriture log:', error);
  }
}

export function clearLogFile() {
  try {
    fs.writeFileSync(LOG_FILE, `=== CRON LOG STARTED AT ${new Date().toISOString()} ===\n`);
  } catch (error) {
    console.error('Erreur clear log:', error);
  }
} 