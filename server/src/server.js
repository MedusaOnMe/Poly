import express from 'express'
import dotenv from 'dotenv'
import cron from 'node-cron'
import path from 'path'
import { fileURLToPath } from 'url'
import { AI_PERSONAS } from './ai-traders.js'
import { initializeAITrader, getAllAITraders, getAllPositions, cleanOldTrades, db } from './firebase.js'
import { initializeAPIs, runAllAITraders, updateUnrealizedPnL, updateMarketDataJob, updateAllBalances } from './trading-engine.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Serve static files from the React app (built frontend)
const clientBuildPath = path.join(__dirname, '../../client/dist')
app.use(express.static(clientBuildPath))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get all AI traders
app.get('/api/traders', async (req, res) => {
  try {
    const traders = await getAllAITraders()
    res.json(traders)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all positions
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await getAllPositions()
    res.json(positions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get recent trades
app.get('/api/trades', async (req, res) => {
  try {
    const tradesRef = db.ref('trades').orderByChild('timestamp').limitToLast(50)
    const snapshot = await tradesRef.once('value')
    const trades = snapshot.val() || {}
    res.json(trades)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get market data
app.get('/api/market', async (req, res) => {
  try {
    const marketRef = db.ref('market_data')
    const snapshot = await marketRef.once('value')
    const market = snapshot.val() || []
    res.json(market)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Manual trigger for trading cycle (for testing)
app.post('/api/trigger-cycle', async (req, res) => {
  try {
    console.log('📢 Manual trading cycle triggered')
    runAllAITraders() // Run async
    res.json({ message: 'Trading cycle started' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Serve React app for all non-API routes (must be last!)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

// Initialize system
async function initialize() {
  console.log('🚀 Initializing AI Trading Arena...\n')

  // Parse Polymarket wallet configs from environment (4 AIs)
  const walletConfigs = [
    {
      privateKey: process.env.POLYMARKET_PRIVATE_KEY_1,
      funder: process.env.POLYMARKET_FUNDER_1,
      proxy: process.env.POLYMARKET_PROXY_1
    },
    {
      privateKey: process.env.POLYMARKET_PRIVATE_KEY_2,
      funder: process.env.POLYMARKET_FUNDER_2,
      proxy: process.env.POLYMARKET_PROXY_2
    },
    {
      privateKey: process.env.POLYMARKET_PRIVATE_KEY_3,
      funder: process.env.POLYMARKET_FUNDER_3,
      proxy: process.env.POLYMARKET_PROXY_3
    },
    {
      privateKey: process.env.POLYMARKET_PRIVATE_KEY_4,
      funder: process.env.POLYMARKET_FUNDER_4,
      proxy: process.env.POLYMARKET_PROXY_4
    }
  ]

  // Initialize Polymarket APIs
  await initializeAPIs(walletConfigs)

  // Initialize AI traders in Firebase (only if they don't exist)
  const existingTraders = await getAllAITraders()
  if (Object.keys(existingTraders).length === 0) {
    console.log('📝 Initializing AI traders in database...')
    for (const [aiId, persona] of Object.entries(AI_PERSONAS)) {
      await initializeAITrader(aiId, persona.name, persona.persona)
      console.log(`   ✅ ${persona.name} initialized`)
    }
  } else {
    console.log('✅ AI traders already initialized in database')
  }

  // Initial market data fetch
  await updateMarketDataJob()

  console.log('\n✅ Initialization complete!\n')
}

// Start server
app.listen(PORT, async () => {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🎮 AI PREDICTION MARKET ARENA`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Platform: Polymarket`)
  console.log(`${'='.repeat(60)}\n`)

  await initialize()

  // Schedule trading cycles every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    console.log(`\n⏰ Scheduled trading cycle triggered at ${new Date().toISOString()}`)
    runAllAITraders()
  })

  // Schedule balance updates every 20 seconds
  cron.schedule('*/20 * * * * *', () => {
    updateAllBalances()
  })

  // Schedule P&L updates every 15 seconds
  cron.schedule('*/15 * * * * *', () => {
    updateUnrealizedPnL()
  })

  // Schedule market data updates every hour (markets don't change rapidly)
  cron.schedule('0 * * * *', () => {
    updateMarketDataJob()
  })

  // Schedule trade cleanup every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('🗑️  Running trade cleanup...')
    cleanOldTrades()
  })

  console.log('📅 Scheduled jobs:')
  console.log('   - Trading cycles: Every 30 seconds')
  console.log('   - Balance updates: Every 20 seconds')
  console.log('   - P&L updates: Every 15 seconds')
  console.log('   - Market data: Every hour')
  console.log('   - Trade cleanup: Every 6 hours')
  console.log('\n✅ All systems operational!\n')

  // Run first cycle immediately (optional, for testing)
  // setTimeout(() => runAllAITraders(), 5000)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...')
  process.exit(0)
})
