import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

// USDC contract on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

// Exchange contract address (where trades happen)
const EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

const RPC_URL = 'https://polygon-rpc.com'

async function checkBalances() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)

  const wallets = {
    'GPT EOA': process.env.POLYMARKET_FUNDER_1,
    'GPT Proxy': process.env.POLYMARKET_PROXY_1,
    'Claude EOA': process.env.POLYMARKET_FUNDER_2,
    'Claude Proxy': process.env.POLYMARKET_PROXY_2,
    'DeepSeek EOA': process.env.POLYMARKET_FUNDER_3,
    'DeepSeek Proxy': process.env.POLYMARKET_PROXY_3,
    'Grok EOA': process.env.POLYMARKET_FUNDER_4,
    'Grok Proxy': process.env.POLYMARKET_PROXY_4
  }

  console.log('🔍 Checking USDC balances and allowances on Polygon...\n')

  for (const [name, address] of Object.entries(wallets)) {
    console.log(`${name}: ${address}`)

    try {
      const balance = await usdc.balanceOf(address)
      const balanceFormatted = ethers.utils.formatUnits(balance, 6) // USDC has 6 decimals

      console.log(`  💵 Balance: $${balanceFormatted}`)

      // Check allowance for proxy wallets
      if (name.includes('Proxy')) {
        const allowance = await usdc.allowance(address, EXCHANGE_ADDRESS)
        const allowanceFormatted = ethers.utils.formatUnits(allowance, 6)
        console.log(`  ✅ Allowance to Exchange: $${allowanceFormatted}`)

        if (parseFloat(allowanceFormatted) === 0) {
          console.log(`  ❌ NO ALLOWANCE SET - This is why orders fail!`)
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }

    console.log()
  }
}

checkBalances()
