import { getAITrader } from './src/firebase.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkPnLHistory() {
  console.log('\n📊 CHECKING P&L HISTORY\n')
  console.log('='.repeat(70))

  const aiIds = ['gpt', 'claude', 'deepseek', 'grok']

  for (const aiId of aiIds) {
    const aiData = await getAITrader(aiId)

    console.log(`\n${aiData.name}:`)
    console.log(`  account_value: $${aiData.account_value || 0}`)
    console.log(`  pnl_history length: ${aiData.pnl_history?.length || 0}`)

    if (aiData.pnl_history && aiData.pnl_history.length > 0) {
      console.log(`  pnl_history (last 5):`, aiData.pnl_history.slice(-5))
    } else {
      console.log(`  pnl_history: EMPTY ❌`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Check complete\n')
}

checkPnLHistory()
