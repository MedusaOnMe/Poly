import dotenv from 'dotenv'
import { AsterAPI } from './src/aster-api.js'

dotenv.config()

const AI_NAMES = ['GPT', 'Claude', 'DeepSeek', 'Grok']

async function getWalletAddresses() {
  console.log('🔍 Fetching wallet addresses for all AI traders...\n')

  for (let i = 1; i <= 4; i++) {
    const apiKey = process.env[`ASTER_API_KEY_${i}`]
    const secretKey = process.env[`ASTER_SECRET_KEY_${i}`]

    if (!apiKey || !secretKey) {
      console.log(`❌ ${AI_NAMES[i-1]}: API keys not found`)
      continue
    }

    try {
      const api = new AsterAPI(apiKey, secretKey)

      // Try v3 endpoint first
      try {
        const accountV3 = await api.getAccountV3()
        console.log(`✅ ${AI_NAMES[i-1]} (Wallet ${i}):`)
        console.log(`   Address: ${accountV3.address || accountV3.walletAddress || 'Not found in v3'}`)
        console.log(`   Full response:`, JSON.stringify(accountV3, null, 2))
        console.log()
      } catch (errV3) {
        // Try v4 endpoint
        const accountV4 = await api.getAccount()
        console.log(`✅ ${AI_NAMES[i-1]} (Wallet ${i}):`)
        console.log(`   Address: ${accountV4.address || accountV4.walletAddress || 'Not found in v4'}`)
        console.log(`   Full response:`, JSON.stringify(accountV4, null, 2))
        console.log()
      }
    } catch (error) {
      console.log(`❌ ${AI_NAMES[i-1]}: ${error.message}\n`)
    }
  }
}

getWalletAddresses()
