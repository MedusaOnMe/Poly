import admin from 'firebase-admin'
import { readFileSync, writeFileSync } from 'fs'
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

// Save current balances first
async function saveCurrentBalances() {
  const snapshot = await db.ref('ai_traders').once('value')
  const data = snapshot.val()

  const current = {
    gpt: data.gpt?.balance || 500,
    claude: data.claude?.balance || 500,
    deepseek: data.deepseek?.balance || 500,
    grok: data.grok?.balance || 500
  }

  console.log('Current balances saved:', current)

  // Save to a backup file
  writeFileSync('./balance-backup.json', JSON.stringify(current, null, 2))

  return current
}

// Set test balances
async function setTestBalances() {
  const current = await saveCurrentBalances()

  // Update both balance AND pnl_history (last value) for each AI
  const snapshot = await db.ref('ai_traders').once('value')
  const data = snapshot.val()

  // GPT: $100
  const gptHistory = data.gpt?.pnl_history || Array(24).fill(500)
  gptHistory[gptHistory.length - 1] = 100
  await db.ref('ai_traders/gpt/balance').set(100)
  await db.ref('ai_traders/gpt/pnl_history').set(gptHistory)

  // Claude: $1500
  const claudeHistory = data.claude?.pnl_history || Array(24).fill(500)
  claudeHistory[claudeHistory.length - 1] = 1500
  await db.ref('ai_traders/claude/balance').set(1500)
  await db.ref('ai_traders/claude/pnl_history').set(claudeHistory)

  // DeepSeek: $750
  const deepseekHistory = data.deepseek?.pnl_history || Array(24).fill(500)
  deepseekHistory[deepseekHistory.length - 1] = 750
  await db.ref('ai_traders/deepseek/balance').set(750)
  await db.ref('ai_traders/deepseek/pnl_history').set(deepseekHistory)

  // Grok: $1000
  const grokHistory = data.grok?.pnl_history || Array(24).fill(500)
  grokHistory[grokHistory.length - 1] = 1000
  await db.ref('ai_traders/grok/balance').set(1000)
  await db.ref('ai_traders/grok/pnl_history').set(grokHistory)

  console.log('✅ Test balances set (including pnl_history):')
  console.log('  GPT: $100')
  console.log('  Claude: $1,500')
  console.log('  DeepSeek: $750')
  console.log('  Grok: $1,000')
  console.log('\n💾 Original balances backed up to balance-backup.json')
  console.log('📝 Run "node revert-balances.js" to restore original balances')

  process.exit(0)
}

setTestBalances().catch(console.error)
