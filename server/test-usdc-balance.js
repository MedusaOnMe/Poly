import { PolymarketAPI } from './src/polymarket-api.js'
import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// USDC contract on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

async function checkUSDCBalance() {
  console.log('\n💰 CHECKING USDC BALANCES\n')
  console.log('='.repeat(70))

  try {
    // Initialize Grok's API
    const api = new PolymarketAPI(process.env.POLYMARKET_PRIVATE_KEY_4)
    await api.initialize()

    const eoaWallet = api.wallet.address
    const proxyWallet = '0x561792605460802A1302a7BbD23fc0f35CeeA19E'

    console.log(`\n📍 EOA Wallet (from private key): ${eoaWallet}`)
    console.log(`📍 Proxy Wallet (from Polymarket): ${proxyWallet}`)

    // Connect to Polygon (ethers v6 syntax)
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com')
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)

    // Check balances
    console.log('\n💵 USDC Balances:')

    const eoaBalance = await usdcContract.balanceOf(eoaWallet)
    const eoaBalanceFormatted = ethers.formatUnits(eoaBalance, 6) // USDC has 6 decimals
    console.log(`  EOA Wallet: ${eoaBalanceFormatted} USDC`)

    const proxyBalance = await usdcContract.balanceOf(proxyWallet)
    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, 6)
    console.log(`  Proxy Wallet: ${proxyBalanceFormatted} USDC`)

    // Check if CLOB client has balance methods
    console.log('\n📊 CLOB Client Methods:')
    if (api.client.getBalanceAllowance) {
      console.log('  ✅ getBalanceAllowance method exists')
      try {
        const balanceAllowance = await api.client.getBalanceAllowance()
        console.log('  Balance/Allowance:', JSON.stringify(balanceAllowance, null, 2))
      } catch (error) {
        console.log('  Error calling getBalanceAllowance:', error.message)
      }
    } else {
      console.log('  ❌ getBalanceAllowance method not found')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Test complete\n')
}

checkUSDCBalance()
