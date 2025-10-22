import dotenv from 'dotenv'
import admin from 'firebase-admin'

dotenv.config()

// Initialize Firebase Admin
let serviceAccount
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} catch (error) {
  console.log('Firebase service account file not found, using environment variables')
}

admin.initializeApp({
  credential: serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()

async function clearDatabase() {
  console.log('🗑️  Clearing Firebase database...\n')

  try {
    // Clear all main data paths
    const paths = [
      'ai_traders',
      'positions',
      'trades',
      'pnl_history',
      'market_data',
      'balance_history',
      'trading_decisions',
      'technical_snapshots',
      'market_snapshots'
    ]

    for (const path of paths) {
      console.log(`Clearing ${path}...`)
      await db.ref(path).remove()
    }

    console.log('\n✅ Database cleared successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing database:', error.message)
    process.exit(1)
  }
}

clearDatabase()
