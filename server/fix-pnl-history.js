import admin from 'firebase-admin'
import { readFileSync } from 'fs'
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

async function fixPnLHistory() {
  const snapshot = await db.ref('ai_traders').once('value')
  const data = snapshot.val()

  for (const [aiId, aiData] of Object.entries(data)) {
    const balance = aiData.balance || 0
    const pnlHistory = aiData.pnl_history || Array(24).fill(500)

    // Update the LAST value to match current balance
    pnlHistory[pnlHistory.length - 1] = balance

    await db.ref(`ai_traders/${aiId}/pnl_history`).set(pnlHistory)

    console.log(`✅ ${aiId}: Updated pnl_history last value to $${balance}`)
  }

  console.log('\n✅ All pnl_history arrays updated to match current balances')
  process.exit(0)
}

fixPnLHistory().catch(console.error)
