import dotenv from 'dotenv'
import { PolymarketAPI } from './src/polymarket-api.js'
import {
  getAITrader,
  updateAITrader,
  getAllPositions,
  removePosition,
  logTrade
} from './src/firebase.js'
import { AI_PERSONAS } from './src/ai-traders.js'

dotenv.config()

// Wallet configurations (matches server.js order: GPT, Claude, DeepSeek, Grok)
const walletConfigs = {
  gpt: {
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_1,
    funder: process.env.POLYMARKET_FUNDER_1,
    proxy: process.env.POLYMARKET_PROXY_1
  },
  claude: {
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_2,
    funder: process.env.POLYMARKET_FUNDER_2,
    proxy: process.env.POLYMARKET_PROXY_2
  },
  deepseek: {
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_3,
    funder: process.env.POLYMARKET_FUNDER_3,
    proxy: process.env.POLYMARKET_PROXY_3
  },
  grok: {
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_4,
    funder: process.env.POLYMARKET_FUNDER_4,
    proxy: process.env.POLYMARKET_PROXY_4
  }
}

// Store API instances
const polymarketAPIs = {}

async function closePosition(aiId, positionId, position) {
  console.log(`\n📉 Closing position for ${position.ai_name}...`)
  console.log(`   Market: ${position.market_question}`)
  console.log(`   Outcome: ${position.outcome}`)
  console.log(`   Shares: ${position.shares}`)

  const api = polymarketAPIs[aiId]
  const aiData = await getAITrader(aiId)

  // Get current balance
  const balance = await api.getProxyUSDCBalance()
  console.log(`   Current balance: $${balance.toFixed(2)}`)

  // Use current price from position or entry price as fallback
  const currentPrice = position.current_price || position.entry_price

  console.log(`   Entry price: $${position.entry_price.toFixed(3)}`)
  console.log(`   Current price: $${currentPrice.toFixed(3)}`)

  // Calculate P&L
  const costBasis = position.cost_basis || (position.shares * position.entry_price)
  const proceeds = position.shares * currentPrice
  const pnl = proceeds - costBasis
  const pnlPercent = (pnl / costBasis) * 100

  console.log(`   Cost basis: $${costBasis.toFixed(2)}`)
  console.log(`   Proceeds: $${proceeds.toFixed(2)}`)
  console.log(`   P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)

  // Calculate holding time
  const holdingTimeMs = Date.now() - position.entry_time
  const holdingHours = Math.floor(holdingTimeMs / (1000 * 60 * 60))
  const holdingMins = Math.floor((holdingTimeMs % (1000 * 60 * 60)) / (1000 * 60))
  const holdingDays = Math.floor(holdingHours / 24)
  const remainingHours = holdingHours % 24
  const holdingTime = holdingDays > 0
    ? `${holdingDays}D ${remainingHours}H`
    : `${holdingHours}H ${holdingMins}M`

  try {
    // Sell shares on Polymarket
    console.log(`   🔄 Executing sell order...`)
    await api.sellShares(position.token_id, position.shares, currentPrice)
    console.log(`   ✅ Sell order executed`)

    // Update balance
    const newBalance = balance + proceeds
    await updateAITrader(aiId, {
      balance: newBalance,
      total_trades: aiData.total_trades + 1,
      wins: pnl > 0 ? aiData.wins + 1 : aiData.wins,
      losses: pnl <= 0 ? (aiData.losses || 0) + 1 : aiData.losses || 0,
      last_decision: 'Test close position'
    })

    // Log completed trade
    await logTrade({
      ai_id: aiId,
      ai_name: aiData.name,
      action: 'SELL',
      market_id: position.market_id,
      market_question: position.market_question,
      outcome: position.outcome,
      shares: position.shares,
      entry_price: position.entry_price,
      exit_price: currentPrice,
      cost: costBasis,
      proceeds: proceeds,
      pnl: pnl,
      pnl_percent: pnlPercent,
      holding_time: holdingTime,
      reasoning: 'Test close - manual position closure',
      message: 'Test close - manual position closure'
    })

    // Remove position from Firebase
    await removePosition(positionId)

    console.log(`   ✅ Position closed successfully`)
    console.log(`   📊 SOLD ${position.outcome} on "${position.market_question}"`)
    console.log(`   💰 Entry: $${position.entry_price.toFixed(3)} → Exit: $${currentPrice.toFixed(3)}`)
    console.log(`   📈 P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Held: ${holdingTime}`)

  } catch (error) {
    console.error(`   ❌ Error closing position:`, error.message)
    throw error
  }
}

async function main() {
  console.log('🔧 TEST: Closing all open positions\n')
  console.log('='.repeat(60))

  // Initialize APIs
  console.log('\n📡 Initializing Polymarket APIs...')
  for (const aiId of Object.keys(AI_PERSONAS)) {
    const config = walletConfigs[aiId]
    if (config) {
      polymarketAPIs[aiId] = new PolymarketAPI(config.privateKey, config.funder, config.proxy)
      await polymarketAPIs[aiId].initialize()
      console.log(`   ✅ ${AI_PERSONAS[aiId].name} initialized`)
    }
  }

  console.log('✅ All APIs initialized\n')

  // Get all positions
  const allPositions = await getAllPositions()
  const positionEntries = Object.entries(allPositions)

  if (positionEntries.length === 0) {
    console.log('No positions to close')
    process.exit(0)
  }

  console.log(`Found ${positionEntries.length} position(s) to close:\n`)

  // Close each position
  for (const [positionId, position] of positionEntries) {
    await closePosition(position.ai_id, positionId, position)

    // Wait 2 seconds between closes
    if (positionEntries.length > 1) {
      console.log('\n⏳ Waiting 2 seconds before next close...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ All positions closed successfully!')
  console.log('\nCheck "SETTLED POSITIONS" tab to see the closed trades')

  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
