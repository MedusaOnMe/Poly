import { PolymarketAPI } from './src/polymarket-api.js'
import { updateAITrader, getAITrader, updatePnLHistory } from './src/firebase.js'
import dotenv from 'dotenv'

dotenv.config()

const AI_TRADERS = {
  gpt: {
    name: 'GPT',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_1,
    proxy: process.env.POLYMARKET_PROXY_1
  },
  claude: {
    name: 'Claude',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_2,
    proxy: process.env.POLYMARKET_PROXY_2
  },
  deepseek: {
    name: 'DeepSeek',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_3,
    proxy: process.env.POLYMARKET_PROXY_3
  },
  grok: {
    name: 'Grok',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_4,
    proxy: process.env.POLYMARKET_PROXY_4
  }
}

async function syncRealBalances() {
  console.log('\n🔄 SYNCING REAL BALANCES FROM DATA API TO FIREBASE\n')
  console.log('='.repeat(70))

  for (const [aiId, config] of Object.entries(AI_TRADERS)) {
    try {
      // Get current Firebase data
      const aiData = await getAITrader(aiId)

      // Initialize API with proxy address
      const api = new PolymarketAPI(config.privateKey, null, config.proxy)
      await api.initialize()

      // Get REAL USDC balance from proxy wallet (liquid funds available)
      const realBalance = await api.getProxyUSDCBalance()

      // Get REAL positions from Data API
      const positions = await api.getUserPositions()
      const positionsValue = positions.reduce((sum, p) => sum + parseFloat(p.value || 0), 0)

      // Total portfolio value = liquid + positions
      const realPortfolioValue = realBalance + positionsValue

      // Calculate real return
      const initialBalance = aiData.initial_balance || 500
      const realReturn = ((realPortfolioValue - initialBalance) / initialBalance) * 100

      console.log(`\n${config.name} (${aiId}):`)
      console.log(`  Firebase Balance:  $${aiData.balance.toFixed(2)} ❌`)
      console.log(`  Real Liquid:       $${realBalance.toFixed(2)} ✅`)
      console.log(`  Real Positions:    $${positionsValue.toFixed(2)}`)
      console.log(`  Portfolio Value:   $${realPortfolioValue.toFixed(2)}`)
      console.log(`  Real Return:       ${realReturn.toFixed(2)}%`)
      console.log(`  Open Positions:    ${positions.length}`)

      // Calculate unrealized P&L
      const unrealizedPnL = positions.reduce((sum, p) => sum + parseFloat(p.pnl || 0), 0)

      // Update Firebase with REAL data
      await updateAITrader(aiId, {
        balance: realBalance,
        account_value: realPortfolioValue,
        unrealized_pnl: unrealizedPnL,
        total_return: realReturn,
        last_update: Date.now()
      })

      // Update P&L history so the chart displays current value
      await updatePnLHistory(aiId, realPortfolioValue)

      console.log(`  ✅ Firebase updated with real balance and P&L history`)

    } catch (error) {
      console.log(`\n${config.name} (${aiId}):`)
      console.log(`  ❌ Error: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Balance sync complete\n')
}

syncRealBalances().catch(console.error)
