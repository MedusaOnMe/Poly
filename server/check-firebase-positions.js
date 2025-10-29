import dotenv from 'dotenv'
import { getAllPositions, getAllAITraders } from './src/firebase.js'

dotenv.config()

async function checkPositions() {
  console.log('🔍 Checking Firebase positions...\n')

  try {
    // Get all positions
    const positions = await getAllPositions()
    const positionCount = Object.keys(positions).length

    console.log(`Found ${positionCount} positions in Firebase:`)
    console.log(JSON.stringify(positions, null, 2))
    console.log()

    // Get AI trader data
    const traders = await getAllAITraders()
    console.log('AI Traders:')
    for (const [id, trader] of Object.entries(traders)) {
      console.log(`${trader.name}: Balance=$${trader.balance?.toFixed(2)}, Account Value=$${trader.account_value?.toFixed(2)}`)
    }

  } catch (error) {
    console.error('Error:', error.message)
  }

  process.exit(0)
}

checkPositions()
