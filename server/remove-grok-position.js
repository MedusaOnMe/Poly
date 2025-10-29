import 'dotenv/config'
import { db } from './src/firebase.js'

console.log('Fetching all positions from Firebase...')

const positionsRef = db.ref('positions')
const snapshot = await positionsRef.once('value')
const positions = snapshot.val() || {}

console.log(`\nFound ${Object.keys(positions).length} total positions:\n`)

let removedCount = 0

for (const [positionId, position] of Object.entries(positions)) {
  console.log(`${positionId}:`)
  console.log(`  AI: ${position.ai_id}`)
  console.log(`  Market: ${position.market_question}`)
  console.log(`  Outcome: ${position.outcome}`)
  console.log(`  Shares: ${position.shares}`)
  console.log(`  Entry: $${position.entry_price}`)
  console.log('')

  // Remove Grok's positions
  if (position.ai_id === 'grok') {
    console.log(`❌ Removing Grok's position...`)
    await positionsRef.child(positionId).remove()
    console.log(`✅ Removed position ${positionId}`)
    removedCount++
  }
}

if (removedCount === 0) {
  console.log('No Grok positions found to remove.')
} else {
  console.log(`\n✅ Removed ${removedCount} Grok position(s)!`)
}

process.exit(0)
