import 'dotenv/config'
import { db } from './src/firebase.js'

console.log('Fetching all positions from Firebase...')

const positionsRef = db.ref('positions')
const snapshot = await positionsRef.once('value')
const positions = snapshot.val() || {}

console.log(`\nFound ${Object.keys(positions).length} total positions:\n`)

for (const [positionId, position] of Object.entries(positions)) {
  console.log(`${positionId}:`)
  console.log(`  AI: ${position.ai_id}`)
  console.log(`  Market: ${position.market_question}`)
  console.log(`  Outcome: ${position.outcome}`)
  console.log(`  Shares: ${position.shares}`)
  console.log(`  Entry: $${position.entry_price}`)
  console.log('')

  // Remove GPT's Harry & Meghan position
  if (position.ai_id === 'gpt' && position.market_question?.includes('Harry')) {
    console.log(`❌ Removing GPT's Harry & Meghan position...`)
    await positionsRef.child(positionId).remove()
    console.log(`✅ Removed position ${positionId}`)
  }
}

console.log('\n✅ Done!')
process.exit(0)
