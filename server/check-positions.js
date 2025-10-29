import { db } from './src/firebase.js'

async function checkPositions() {
  try {
    const positionsRef = db.ref('positions')
    const snapshot = await positionsRef.once('value')
    const positions = snapshot.val()

    if (!positions) {
      console.log('No positions in Firebase')
      return
    }

    console.log('\n=== ALL POSITIONS IN FIREBASE ===\n')

    for (const [posId, pos] of Object.entries(positions)) {
      console.log(`Position ID: ${posId}`)
      console.log(`  AI ID: ${pos.ai_id}`)
      console.log(`  AI Name: ${pos.ai_name}`)
      console.log(`  Market: ${pos.market_question}`)
      console.log(`  Outcome: ${pos.outcome}`)
      console.log(`  Shares: ${pos.shares}`)
      console.log(`  Entry Price: $${pos.entry_price}`)
      console.log(`  Current Price: $${pos.current_price}`)
      console.log(`  Unrealized P&L: $${pos.unrealized_pnl}`)
      console.log(`  Token ID: ${pos.token_id?.substring(0, 30)}...`)
      console.log()
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkPositions()
