import { db } from './src/firebase.js'

async function deletePosition() {
  try {
    const positionId = 'gpt_516961_1761766703837'
    await db.ref(`positions/${positionId}`).remove()
    console.log(`✅ Deleted broken position: ${positionId}`)
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

deletePosition()
