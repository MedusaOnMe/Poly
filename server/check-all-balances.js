import { PolymarketAPI } from './src/polymarket-api.js'
import dotenv from 'dotenv'

dotenv.config()

const AI_TRADERS = {
  gpt: {
    name: 'GPT',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_1,
    funder: process.env.POLYMARKET_FUNDER_1,
    proxy: process.env.POLYMARKET_PROXY_1
  },
  claude: {
    name: 'Claude',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_2,
    funder: process.env.POLYMARKET_FUNDER_2,
    proxy: process.env.POLYMARKET_PROXY_2
  },
  deepseek: {
    name: 'DeepSeek',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_3,
    funder: process.env.POLYMARKET_FUNDER_3,
    proxy: process.env.POLYMARKET_PROXY_3
  },
  grok: {
    name: 'Grok',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_4,
    funder: process.env.POLYMARKET_FUNDER_4,
    proxy: process.env.POLYMARKET_PROXY_4
  }
}

async function checkAllBalances() {
  console.log('\n🔍 CHECKING ALL AI ACCOUNT BALANCES FROM DATA API\n')
  console.log('='.repeat(70))

  for (const [aiId, config] of Object.entries(AI_TRADERS)) {
    try {
      const api = new PolymarketAPI(config.privateKey, config.funder, config.proxy)
      await api.initialize()

      // Get portfolio value from Data API
      const portfolioValue = await api.getUserPortfolioValue()

      // Get positions from Data API
      const positions = await api.getUserPositions()

      // Calculate liquid balance
      const positionsValue = positions.reduce((sum, p) => sum + parseFloat(p.value || 0), 0)
      const liquidBalance = portfolioValue - positionsValue

      console.log(`\n${config.name} (${aiId}):`)
      console.log(`  Wallet: ${api.wallet.address}`)
      console.log(`  Portfolio Value: $${portfolioValue.toFixed(2)}`)
      console.log(`  Liquid Balance:  $${liquidBalance.toFixed(2)}`)
      console.log(`  Positions Value: $${positionsValue.toFixed(2)}`)
      console.log(`  Open Positions:  ${positions.length}`)

      if (positions.length > 0) {
        console.log(`  Positions:`)
        positions.forEach(pos => {
          const pnl = parseFloat(pos.pnl || 0)
          const pnlSign = pnl >= 0 ? '+' : ''
          console.log(`    - ${pos.side} "${pos.question?.substring(0, 50)}..." | P&L: ${pnlSign}$${pnl.toFixed(2)}`)
        })
      }

    } catch (error) {
      console.log(`\n${config.name} (${aiId}):`)
      console.log(`  ❌ Error: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Balance check complete\n')
}

checkAllBalances().catch(console.error)
