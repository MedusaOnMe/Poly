import 'dotenv/config'
import { PolymarketAPI } from './src/polymarket-api.js'

const api = new PolymarketAPI(
  process.env.POLYMARKET_PRIVATE_KEY_1,
  process.env.POLYMARKET_FUNDER_1,
  process.env.POLYMARKET_PROXY_1
)

console.log('Initializing GPT wallet...')
await api.initialize()

console.log('\n=== Getting Data API Positions ===')
const positions = await api.getUserPositions()
console.log(`Found ${positions.length} positions:`)
console.log(JSON.stringify(positions, null, 2))

console.log('\n=== Getting Portfolio Value ===')
const portfolioValue = await api.getUserPortfolioValue()
console.log(`Portfolio value: $${portfolioValue}`)

console.log('\n=== Getting USDC Balance ===')
const usdcBalance = await api.getProxyUSDCBalance()
console.log(`USDC balance: $${usdcBalance}`)

process.exit(0)
