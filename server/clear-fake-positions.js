import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.database()

async function clearFakePositions() {
  console.log('Clearing fake positions from Firebase...\n')

  try {
    // Clear all positions
    await db.ref('positions').remove()
    console.log('✅ All positions cleared')

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

clearFakePositions()
