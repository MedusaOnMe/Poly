import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'))
} catch (error) {
  console.warn('Firebase service account file not found, using environment variables')
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()

async function revertBalances() {
  if (!existsSync('./balance-backup.json')) {
    console.error('❌ No backup file found! (balance-backup.json)')
    console.log('Cannot revert balances without backup.')
    process.exit(1)
  }

  const backup = JSON.parse(readFileSync('./balance-backup.json', 'utf8'))

  // Get current pnl_history arrays
  const snapshot = await db.ref('ai_traders').once('value')
  const data = snapshot.val()

  // Update balance AND fix pnl_history (set last value to match balance)
  const gptHistory = data.gpt?.pnl_history || Array(24).fill(500)
  gptHistory[gptHistory.length - 1] = backup.gpt
  await db.ref('ai_traders/gpt/balance').set(backup.gpt)
  await db.ref('ai_traders/gpt/pnl_history').set(gptHistory)

  const claudeHistory = data.claude?.pnl_history || Array(24).fill(500)
  claudeHistory[claudeHistory.length - 1] = backup.claude
  await db.ref('ai_traders/claude/balance').set(backup.claude)
  await db.ref('ai_traders/claude/pnl_history').set(claudeHistory)

  const deepseekHistory = data.deepseek?.pnl_history || Array(24).fill(500)
  deepseekHistory[deepseekHistory.length - 1] = backup.deepseek
  await db.ref('ai_traders/deepseek/balance').set(backup.deepseek)
  await db.ref('ai_traders/deepseek/pnl_history').set(deepseekHistory)

  const grokHistory = data.grok?.pnl_history || Array(24).fill(500)
  grokHistory[grokHistory.length - 1] = backup.grok
  await db.ref('ai_traders/grok/balance').set(backup.grok)
  await db.ref('ai_traders/grok/pnl_history').set(grokHistory)

  console.log('✅ Balances AND pnl_history reverted to original values:')
  console.log(`  GPT: $${backup.gpt}`)
  console.log(`  Claude: $${backup.claude}`)
  console.log(`  DeepSeek: $${backup.deepseek}`)
  console.log(`  Grok: $${backup.grok}`)

  process.exit(0)
}

revertBalances().catch(console.error)
