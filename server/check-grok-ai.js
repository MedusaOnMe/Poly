import { db } from './src/firebase.js'

async function checkGrok() {
  try {
    const aiRef = db.ref('ai_traders/grok')
    const snapshot = await aiRef.once('value')
    const grok = snapshot.val()

    console.log('\n=== GROK AI TRADER DATA ===\n')
    console.log(`Name: ${grok.name}`)
    console.log(`Balance (cash): $${grok.balance}`)
    console.log(`Account Value (total): $${grok.account_value}`)
    console.log(`Total Trades: ${grok.total_trades}`)
    console.log(`Wins: ${grok.wins}`)
    console.log(`Losses: ${grok.losses || 0}`)
    console.log(`Last Update: ${new Date(grok.last_update).toLocaleString()}`)

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkGrok()
