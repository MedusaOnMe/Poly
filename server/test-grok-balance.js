import { PolymarketAPI } from './src/polymarket-api.js'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

async function testGrokBalance() {
  console.log('\n🔍 TESTING GROK BALANCE API CALL\n')
  console.log('='.repeat(70))

  try {
    // Initialize Grok's API
    const api = new PolymarketAPI(process.env.POLYMARKET_PRIVATE_KEY_4)
    await api.initialize()

    const walletAddress = api.wallet.address
    console.log(`\n📍 Grok Wallet Address: ${walletAddress}`)

    // Test 1: Direct API call to /value endpoint
    console.log('\n📊 Test 1: Direct axios call to /value endpoint')
    const valueUrl = `https://data-api.polymarket.com/value?user=${walletAddress}`
    console.log(`URL: ${valueUrl}`)

    try {
      const valueResponse = await axios.get(valueUrl)
      console.log('Response:', JSON.stringify(valueResponse.data, null, 2))
    } catch (error) {
      console.log('Error:', error.message)
      if (error.response) {
        console.log('Status:', error.response.status)
        console.log('Data:', error.response.data)
      }
    }

    // Test 2: Use our API wrapper
    console.log('\n📊 Test 2: Using PolymarketAPI.getUserPortfolioValue()')
    const portfolioValue = await api.getUserPortfolioValue()
    console.log('Portfolio Value:', portfolioValue)

    // Test 3: Direct API call to /positions endpoint
    console.log('\n📊 Test 3: Direct axios call to /positions endpoint')
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${walletAddress}&limit=100`
    console.log(`URL: ${positionsUrl}`)

    try {
      const positionsResponse = await axios.get(positionsUrl)
      console.log('Response:', JSON.stringify(positionsResponse.data, null, 2))
    } catch (error) {
      console.log('Error:', error.message)
      if (error.response) {
        console.log('Status:', error.response.status)
        console.log('Data:', error.response.data)
      }
    }

    // Test 4: Use our API wrapper
    console.log('\n📊 Test 4: Using PolymarketAPI.getUserPositions()')
    const positions = await api.getUserPositions()
    console.log('Positions count:', positions.length)
    console.log('Positions:', JSON.stringify(positions, null, 2))

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Test complete\n')
}

testGrokBalance()
