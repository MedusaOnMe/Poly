import express from 'express'
import dotenv from 'dotenv'
import cron from 'node-cron'
import path from 'path'
import { fileURLToPath } from 'url'
import { AI_PERSONAS } from './ai-traders.js'
import { initializeAITrader, getAllAITraders, getAllPositions, db } from './firebase.js'
import { initializeAPIs, runAllAITraders, updateUnrealizedPnL, updateMarketDataJob } from './trading-engine.js'

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

  // Parse API keys from environment (ONLY 4 AIs)
  const apiKeys = [
    {
      apiKey: process.env.ASTER_API_KEY_1,
      secretKey: process.env.ASTER_SECRET_KEY_1
    },
    {
      apiKey: process.env.ASTER_API_KEY_2,
      secretKey: process.env.ASTER_SECRET_KEY_2
    },
    {
      apiKey: process.env.ASTER_API_KEY_3,
      secretKey: process.env.ASTER_SECRET_KEY_3
    },
    {
      apiKey: process.env.ASTER_API_KEY_4,
      secretKey: process.env.ASTER_SECRET_KEY_4
    }
  ]

  // Initialize Aster APIs
  await initializeAPIs(apiKeys)

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
  console.log(`🎮 AI TRADING ARENA SERVER`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`${'='.repeat(60)}\n`)

  await initialize()

  // Schedule trading cycles every 3 minutes
  cron.schedule('*/3 * * * *', () => {
    console.log(`\n⏰ Scheduled trading cycle triggered at ${new Date().toISOString()}`)
    runAllAITraders()
  })

  // Schedule P&L updates every minute
  cron.schedule('* * * * *', () => {
    updateUnrealizedPnL()
  })

  // Schedule market data updates every 30 seconds
  cron.schedule('*/30 * * * * *', () => {
    updateMarketDataJob()
  })

  console.log('📅 Scheduled jobs:')
  console.log('   - Trading cycles: Every 3 minutes')
  console.log('   - P&L updates: Every 1 minute')
  console.log('   - Market data: Every 30 seconds')
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
