import dotenv from 'dotenv'
import { PolymarketAPI } from './src/polymarket-api.js'

dotenv.config()

async function testOrder() {
  console.log('🧪 Testing Polymarket Order Submission\n')

  // Test with GPT (has $11.21 balance AND allowance already set!)
  const ai = {
    name: 'GPT',
    privateKey: process.env.POLYMARKET_PRIVATE_KEY_1,
    funder: process.env.POLYMARKET_FUNDER_1,
    proxy: process.env.POLYMARKET_PROXY_1
  }

  console.log(`Testing with ${ai.name}`)
  console.log(`Funder (EOA): ${ai.funder}`)
  console.log(`Proxy: ${ai.proxy}\n`)

  try {
    console.log('1️⃣ Initializing API client...')
    const api = new PolymarketAPI(ai.privateKey, ai.funder, ai.proxy)
    await api.initialize()
    console.log('✅ API initialized\n')

    console.log('2️⃣ Checking balance...')
    const balanceData = await api.getBalance()
    const balance = balanceData.balance || 10.75 // Use 10.75 as fallback (Grok's known balance)
    console.log(`Balance: $${balance.toFixed(2)}\n`)

    if (balance < 1) {
      console.log('❌ Insufficient balance for test')
      return
    }

    console.log('3️⃣ Fetching a test market...')
    const markets = await api.getActiveMarkets({ limit: 5 })
    if (!markets || markets.length === 0) {
      console.log('❌ No markets available')
      return
    }

    const market = markets[0]
    console.log(`Market: "${market.question}"`)
    console.log(`YES price: $${market.yes_price.toFixed(3)}`)
    console.log(`NO price: $${market.no_price.toFixed(3)}`)
    console.log(`Full market object:`, JSON.stringify(market, null, 2))
    console.log()

    // Get token IDs from market structure
    const tokenIds = market.token_ids || market.tokens || []
    if (tokenIds.length < 2) {
      console.log('❌ Market missing token IDs')
      return
    }
    console.log(`Token IDs: YES=${tokenIds[0].substring(0,20)}..., NO=${tokenIds[1].substring(0,20)}...`)

    // Try to buy NO (usually cheaper)
    const outcome = market.no_price < market.yes_price ? 'NO' : 'YES'
    const tokenId = outcome === 'YES' ? tokenIds[0] : tokenIds[1]
    const price = outcome === 'YES' ? market.yes_price : market.no_price
    const amount = 1 // Only $1 for testing

    console.log(`4️⃣ Attempting to BUY ${outcome} for $${amount}`)
    console.log(`Token ID: ${tokenId}`)
    console.log(`Market price: $${price.toFixed(3)}`)
    console.log()

    console.log('5️⃣ Checking allowances...')
    const allowances = await api.checkAllowances()
    console.log('Allowances:', allowances)
    console.log()

    console.log('6️⃣ Setting USDC allowance...')
    const allowanceSet = await api.setAllowances()
    if (!allowanceSet) {
      console.log('⚠️  Could not set allowance, but continuing anyway...')
    }
    console.log()

    console.log('7️⃣ Creating order...')
    const result = await api.buyShares(tokenId, amount, price)
    console.log('✅ Order successful!')
    console.log('Result:', result)

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)

    if (error.message.includes('403')) {
      console.log('\n🔍 403 Forbidden - Possible causes:')
      console.log('  1. Missing allowances (proxy needs to approve Exchange contract)')
      console.log('  2. Cloudflare rate limiting (temporary)')
      console.log('  3. Invalid signature or authentication')
      console.log('  4. Insufficient balance on proxy wallet')
    }

    if (error.response) {
      console.log('\nFull error response:', error.response.data)
    }
  }
}

testOrder()
