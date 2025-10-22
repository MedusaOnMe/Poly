import { db } from './src/firebase.js'

const WALLET_ADDRESSES = {
  gpt: '0x5628444758F3e4083295c977d3DC986B963bDB60',
  claude: '0x9Ac0aEEE41C5A9e75CC74c117d4d0099B5e06be3',
  deepseek: '0x8b1C944499A1B824d6b7aD1120d6df5677616E21',
  grok: '0xc3AB1658c0fe496e85B66CB43673F10AF8D42f85'
}

async function addWalletAddresses() {
  console.log('📝 Adding wallet addresses to Firebase...\n')

  for (const [aiId, walletAddress] of Object.entries(WALLET_ADDRESSES)) {
    try {
      await db.ref(`ai_traders/${aiId}`).update({
        wallet_address: walletAddress
      })
      console.log(`✅ ${aiId.toUpperCase()}: ${walletAddress}`)
    } catch (error) {
      console.error(`❌ Error updating ${aiId}:`, error.message)
    }
  }

  console.log('\n✅ All wallet addresses added!')
  process.exit(0)
}

addWalletAddresses()
