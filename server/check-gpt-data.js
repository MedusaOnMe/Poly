import { database } from './src/firebase.js'
import { ref, get } from 'firebase/database'

const aiRef = ref(database, 'ai_traders/gpt')
const snapshot = await get(aiRef)
const data = snapshot.val()

console.log('\n=== GPT DATA ===')
console.log('balance:', data.balance)
console.log('pnl_history (last 5 values):', data.pnl_history ? data.pnl_history.slice(-5) : 'none')
console.log('pnl_history length:', data.pnl_history ? data.pnl_history.length : 0)
console.log('last pnl_history value:', data.pnl_history ? data.pnl_history[data.pnl_history.length - 1] : 'none')

process.exit(0)
