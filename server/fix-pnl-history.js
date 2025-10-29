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
    const currentValue = aiData.account_value || aiData.balance || 500
    const oldLength = aiData.pnl_history?.length || 0

    // ALWAYS create a fresh 24-element array filled with current value
    const newPnlHistory = Array(24).fill(currentValue)

    await db.ref(`ai_traders/${aiId}/pnl_history`).set(newPnlHistory)

    console.log(`✅ ${aiData.name}: Fixed pnl_history`)
    console.log(`   Old length: ${oldLength} → New length: 24`)
    console.log(`   Filled with current value: $${currentValue.toFixed(2)}`)
  }

  console.log('\n✅ All pnl_history arrays fixed! Chart should now show lines.')
  process.exit(0)
}

fixPnLHistory().catch(console.error)
