import dotenv from 'dotenv'
import admin from 'firebase-admin'

dotenv.config()

// Initialize Firebase Admin
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

async function nukeDatabase() {
  console.log('🔥 NUKING OLD ASTER DEX DATABASE...\n')

  try {
    // Delete all old data
    console.log('Deleting ai_traders...')
    await db.ref('ai_traders').remove()

    console.log('Deleting positions...')
    await db.ref('positions').remove()

    console.log('Deleting trades...')
    await db.ref('trades').remove()

    console.log('Deleting market_data...')
    await db.ref('market_data').remove()

    console.log('Deleting historical data...')
    await db.ref('historical').remove()

    console.log('\n✅ DATABASE NUKED SUCCESSFULLY!')
    console.log('\nNow initializing fresh AI traders for Polymarket...\n')

    // Initialize fresh AI traders
    const aiTraders = {
      gpt: {
        id: 'gpt',
        name: 'GPT',
        persona: 'Balanced Fundamentalist',
        balance: 150,
        initial_balance: 150,
        total_return: 0,
        total_trades: 0,
        wins: 0,
        losses: 0,
        pnl_24h: 0,
        pnl_history: Array(24).fill(150),
        account_value: 150,
        unrealized_pnl: 0,
        last_decision: 'Ready to analyze prediction markets',
        last_update: Date.now()
      },
      claude: {
        id: 'claude',
        name: 'Claude',
        persona: 'Research-Driven Analyst',
        balance: 150,
        initial_balance: 150,
        total_return: 0,
        total_trades: 0,
        wins: 0,
        losses: 0,
        pnl_24h: 0,
        pnl_history: Array(24).fill(150),
        account_value: 150,
        unrealized_pnl: 0,
        last_decision: 'Ready to analyze prediction markets',
        last_update: Date.now()
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        persona: 'Momentum Scalper',
        balance: 150,
        initial_balance: 150,
        total_return: 0,
        total_trades: 0,
        wins: 0,
        losses: 0,
        pnl_24h: 0,
        pnl_history: Array(24).fill(150),
        account_value: 150,
        unrealized_pnl: 0,
        last_decision: 'Ready to analyze prediction markets',
        last_update: Date.now()
      },
      grok: {
        id: 'grok',
        name: 'Grok',
        persona: 'Contrarian Fader',
        balance: 150,
        initial_balance: 150,
        total_return: 0,
        total_trades: 0,
        wins: 0,
        losses: 0,
        pnl_24h: 0,
        pnl_history: Array(24).fill(150),
        account_value: 150,
        unrealized_pnl: 0,
        last_decision: 'Ready to analyze prediction markets',
        last_update: Date.now()
      }
    }

    await db.ref('ai_traders').set(aiTraders)

    console.log('✅ Fresh AI traders initialized!')
    console.log('\n🎯 Database is now clean and ready for Polymarket trading!\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error nuking database:', error)
    process.exit(1)
  }
}

nukeDatabase()
