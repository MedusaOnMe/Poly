import { PolymarketAPI } from './src/polymarket-api.js'
import dotenv from 'dotenv'

dotenv.config()

async function testClobProxy() {
  console.log('\n🔍 TESTING CLOB CLIENT FOR PROXY ADDRESS\n')
  console.log('='.repeat(70))

  try {
    const api = new PolymarketAPI(process.env.POLYMARKET_PRIVATE_KEY_4)
    await api.initialize()

    console.log('\n📋 CLOB Client Properties:')
    console.log('  Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(api.client)).filter(m => m !== 'constructor'))

    console.log('\n📋 CLOB Client Fields:')
    const clientKeys = Object.keys(api.client).filter(k => !k.startsWith('_'))
    console.log(' ', clientKeys)

    // Try to call any method that might give us proxy info
    if (api.client.getProxyWalletAddress) {
      console.log('\n✅ Found getProxyWalletAddress method')
      const proxy = await api.client.getProxyWalletAddress()
      console.log('  Proxy address:', proxy)
    }

    // Check signer
    if (api.client.signer) {
      console.log('\n📝 Signer info:')
      console.log('  Type:', typeof api.client.signer)
      console.log('  Has getAddress:', typeof api.client.signer.getAddress)
      if (typeof api.client.signer.getAddress === 'function') {
        const signerAddr = await api.client.signer.getAddress()
        console.log('  Signer address:', signerAddr)
      }
      if (api.client.signer.address) {
        console.log('  Signer.address:', api.client.signer.address)
      }
    }

    // Check if there's a creds or credentials object
    if (api.client.creds) {
      console.log('\n🔐 Credentials:')
      console.log('  Keys:', Object.keys(api.client.creds))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Test complete\n')
}

testClobProxy()
