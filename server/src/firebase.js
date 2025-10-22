import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Firebase Admin
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'))
} catch (error) {
  console.warn('Firebase service account file not found, using environment variables')
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

export const db = admin.database()

// Database helper functions

// Initialize AI trader data
export async function initializeAITrader(aiId, name, persona) {
  const ref = db.ref(`ai_traders/${aiId}`)
  await ref.set({
    id: aiId,
    name,
    persona,
    balance: 500,
    initial_balance: 500,
    total_return: 0,
    total_trades: 0,
    wins: 0,
    losses: 0,
    pnl_24h: 0,
    pnl_history: Array(24).fill(500),
    last_decision: null,
    last_update: Date.now()
  })
}

// Update AI trader data
export async function updateAITrader(aiId, updates) {
  const ref = db.ref(`ai_traders/${aiId}`)
  await ref.update({
    ...updates,
    last_update: Date.now()
  })
}

// Get AI trader data
export async function getAITrader(aiId) {
  const ref = db.ref(`ai_traders/${aiId}`)
  const snapshot = await ref.once('value')
  return snapshot.val()
}

// Log trade
export async function logTrade(trade) {
  const ref = db.ref('trades').push()
  await ref.set({
    ...trade,
    timestamp: Date.now()
  })
}

// Update position
export async function updatePosition(positionId, positionData) {
  const ref = db.ref(`positions/${positionId}`)
  await ref.set({
    ...positionData,
    last_update: Date.now()
  })
}

// Remove position
export async function removePosition(positionId) {
  const ref = db.ref(`positions/${positionId}`)
  await ref.remove()
}

// Get all positions
export async function getAllPositions() {
  const ref = db.ref('positions')
  const snapshot = await ref.once('value')
  return snapshot.val() || {}
}

// Update market data
export async function updateMarketData(marketData) {
  const ref = db.ref('market_data')
  await ref.set(marketData)
}

// Update PnL history (rolling 24h)
export async function updatePnLHistory(aiId, currentBalance) {
  const aiData = await getAITrader(aiId)
  const history = aiData.pnl_history || Array(24).fill(500)

  // Ensure currentBalance is valid
  const validBalance = isNaN(currentBalance) || !isFinite(currentBalance) ? 0 : currentBalance

  // Shift array and add new value
  history.shift()
  history.push(validBalance)

  // Calculate 24h PnL percentage (avoid division by zero)
  const pnl_24h = history[0] > 0 ? ((validBalance - history[0]) / history[0]) * 100 : 0

  await updateAITrader(aiId, {
    pnl_history: history,
    pnl_24h
  })
}

// ========================================
// COMPREHENSIVE HISTORICAL DATA STORAGE
// ========================================

// Store balance snapshot (every minute)
export async function storeBalanceSnapshot(aiId, snapshot) {
  const ref = db.ref(`historical/balance_snapshots/${aiId}`).push()
  await ref.set({
    ...snapshot,
    timestamp: Date.now()
  })
}

// Store trading decision (every cycle)
export async function storeTradingDecision(aiId, decision, context) {
  const ref = db.ref(`historical/decisions/${aiId}`).push()
  await ref.set({
    decision,
    context: {
      balance: context.balance,
      total_return: context.totalReturn,
      positions_count: context.positions?.length || 0,
      positions: context.positions || []
    },
    timestamp: Date.now()
  })
}

// Store technical indicators snapshot (every cycle)
export async function storeTechnicalSnapshot(symbols, technicalData) {
  const ref = db.ref(`historical/technical_indicators`).push()
  await ref.set({
    symbols,
    data: technicalData,
    timestamp: Date.now()
  })
}

// Store market data snapshot (every update)
export async function storeMarketSnapshot(marketData) {
  const ref = db.ref(`historical/market_data`).push()
  await ref.set({
    data: marketData,
    timestamp: Date.now()
  })
}

// Get all AI traders
export async function getAllAITraders() {
  const ref = db.ref('ai_traders')
  const snapshot = await ref.once('value')
  return snapshot.val() || {}
}
