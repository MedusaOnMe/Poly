import { AsterAPI } from './aster-api.js'
import { AI_PERSONAS, getAIDecision } from './ai-traders.js'
import { getMultiSymbolAnalysis } from './indicators.js'
import {
  getAITrader,
  updateAITrader,
  updatePosition,
  removePosition,
  getAllPositions,
  logTrade,
  updatePnLHistory,
  updateMarketData,
  storeBalanceSnapshot,
  storeTradingDecision,
  storeTechnicalSnapshot,
  storeMarketSnapshot
} from './firebase.js'

// Store API instances for each AI
const asterAPIs = {}

// Initialize Aster API clients
export async function initializeAPIs(apiKeys) {
  for (const [index, aiId] of Object.keys(AI_PERSONAS).entries()) {
    const { apiKey, secretKey } = apiKeys[index]
    asterAPIs[aiId] = new AsterAPI(apiKey, secretKey)

    // Set position mode to hedge for each account
    try {
      await asterAPIs[aiId].setPositionModeHedge()
      console.log(`✅ ${aiId}: Hedge mode enabled`)
    } catch (error) {
      // If already in hedge mode, this will error - that's okay
      const errorCode = error.response?.data?.code
      if (errorCode === -4059) {
        console.log(`✅ ${aiId}: Already in hedge mode`)
      } else if (errorCode === -4061) {
        console.log(`⚠️  ${aiId}: Cannot change position mode - close all positions first`)
      } else {
        console.log(`⚠️  ${aiId}: Could not set hedge mode - ${error.message} (code: ${errorCode})`)
      }
    }
  }
  console.log('✅ Aster API clients initialized for all AI traders')
}

// Fetch and update market data
export async function updateMarketDataJob() {
  try {
    // Use any API instance to fetch public market data
    const api = Object.values(asterAPIs)[0]
    if (!api) return

    const ticker24h = await api.get24hTicker()

    // Get top perpetuals by volume
    const topMarkets = Array.isArray(ticker24h)
      ? ticker24h
          .filter(t => t.symbol.endsWith('USDT'))
          .sort((a, b) => parseFloat(b.quoteVolume || 0) - parseFloat(a.quoteVolume || 0))
          .slice(0, 20)
          .map(t => ({
            symbol: t.symbol,
            price: parseFloat(t.lastPrice),
            change_24h: parseFloat(t.priceChangePercent),
            volume: parseFloat(t.volume)
          }))
      : []

    await updateMarketData(topMarkets)

    // STORE MARKET DATA SNAPSHOT (historical)
    await storeMarketSnapshot(topMarkets)

    console.log(`📊 Market data updated: ${topMarkets.length} symbols`)

    return topMarkets
  } catch (error) {
    console.error('Error updating market data:', error.message)
    return []
  }
}

// Helper function to get correct precision for a symbol
function getQuantityPrecision(symbol) {
  // Most symbols use 3 decimal places
  // Some like BTC/ETH/BNB use fewer decimals
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('BNB')) {
    return 2  // 2 decimal places for BTC/ETH/BNB
  }
  return 3  // 3 decimal places for most altcoins
}

// Execute AI trading decision
async function executeDecision(aiId, decision) {
  const api = asterAPIs[aiId]
  const aiData = await getAITrader(aiId)

  try {
    if (decision.action === 'HOLD') {
      console.log(`${aiData.name}: HOLD - ${decision.message || decision.reasoning}`)

      // Update AI trader with conversational message
      await updateAITrader(aiId, {
        last_decision: decision.message || decision.reasoning
      })

      // Log HOLD decision so it shows up in model chat
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'HOLD',
        reasoning: decision.reasoning || decision.message || 'Holding current positions',
        message: decision.message || decision.reasoning || 'Holding current positions'
      })

      return
    }

    if (decision.action === 'CLOSE') {
      // Find and close position
      const positions = await getAllPositions()
      const positionToClose = Object.entries(positions).find(
        ([id, pos]) => pos.ai_id === aiId && pos.symbol === decision.symbol
      )

      if (positionToClose) {
        const [positionId, position] = positionToClose

        // Get current price
        const currentPrice = await api.getPrice(position.symbol)
        const exitPrice = parseFloat(currentPrice.price)

        // Calculate PnL with leverage
        const priceDiff = position.side === 'LONG'
          ? exitPrice - position.entry_price
          : position.entry_price - exitPrice
        const pnlPercent = (priceDiff / position.entry_price) * 100
        const pnl = (pnlPercent / 100) * position.notional // P&L based on notional value

        // Calculate holding time
        const holdingTimeMs = Date.now() - (position.entry_time || Date.now())
        const holdingHours = Math.floor(holdingTimeMs / 3600000)
        const holdingMins = Math.floor((holdingTimeMs % 3600000) / 60000)
        const holdingTime = `${holdingHours}H ${holdingMins}M`

        // Close position on exchange
        await api.closePosition(position.symbol, position.side, position.quantity)

        // Cancel any open SL/TP orders for this position
        try {
          if (position.stop_loss_order_id) {
            await api.cancelOrder(position.symbol, position.stop_loss_order_id)
            console.log(`${aiData.name}: Cancelled stop loss order (ID: ${position.stop_loss_order_id})`)
          }
          if (position.take_profit_order_id) {
            await api.cancelOrder(position.symbol, position.take_profit_order_id)
            console.log(`${aiData.name}: Cancelled take profit order (ID: ${position.take_profit_order_id})`)
          }
        } catch (cancelError) {
          console.error(`${aiData.name}: Error cancelling SL/TP orders:`, cancelError.message)
          // Continue anyway - orders may already be filled or cancelled
        }

        // Update balance (collateral + P&L)
        const newBalance = aiData.balance + position.collateral + pnl
        await updateAITrader(aiId, {
          balance: newBalance,
          total_trades: aiData.total_trades + 1,
          wins: pnl > 0 ? aiData.wins + 1 : aiData.wins,
          losses: pnl <= 0 ? (aiData.losses || 0) + 1 : aiData.losses || 0,
          last_decision: decision.message || decision.reasoning
        })

        // Log completed trade with all details
        await logTrade({
          ai_id: aiId,
          ai_name: aiData.name,
          action: 'COMPLETED',
          symbol: position.symbol,
          side: position.side,
          quantity: position.quantity,
          leverage: position.leverage,
          entry_price: position.entry_price,
          exit_price: exitPrice,
          notional_entry: position.notional,
          notional_exit: position.notional + pnl,
          holding_time: holdingTime,
          holding_time_ms: holdingTimeMs,
          pnl: pnl,
          pnl_percent: pnlPercent,
          reasoning: decision.reasoning || decision.message || 'Position closed',
          message: decision.message || decision.reasoning || 'Position closed'
        })

        // Remove position
        await removePosition(positionId)

        console.log(`${aiData.name}: CLOSED ${position.side} ${position.symbol} | Entry: $${position.entry_price.toFixed(2)} → Exit: $${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Held: ${holdingTime}`)
      }
      return
    }

    // LONG or SHORT action
    if (decision.action === 'LONG' || decision.action === 'SHORT') {
      const { symbol, size, leverage = 10 } = decision

      // Validate balance
      if (aiData.balance <= 0) {
        console.log(`${aiData.name}: Cannot trade with zero balance`)
        return
      }

      // Get current price
      const currentPrice = await api.getPrice(symbol)
      const entryPrice = parseFloat(currentPrice.price)

      // Calculate position size properly:
      // 1. Determine how much of balance to use (AI suggests 'size' in USD, cap at 70% of balance)
      const collateralUSD = Math.min(size || aiData.balance * 0.5, aiData.balance * 0.7)

      // 2. Calculate notional position value with leverage
      const notionalValue = collateralUSD * leverage

      // 3. Convert to coin quantity
      const quantity = notionalValue / entryPrice

      // Validate quantity is positive and above minimum
      if (quantity <= 0 || quantity < 0.001) {
        console.log(`${aiData.name}: Quantity ${quantity} too small for ${symbol}, skipping`)
        return
      }

      // Get correct precision for this symbol
      const precision = getQuantityPrecision(symbol)
      const quantityFormatted = quantity.toFixed(precision)

      console.log(`${aiData.name}: Opening ${decision.action} ${symbol} | Collateral: $${collateralUSD.toFixed(2)} | Leverage: ${leverage}x | Notional: $${notionalValue.toFixed(2)} | Quantity: ${quantityFormatted}`)

      // Place order
      const side = decision.action === 'LONG' ? 'BUY' : 'SELL'
      await api.placeOrder({
        symbol,
        side,
        type: 'MARKET',
        quantity: quantityFormatted,
        positionSide: decision.action,
        leverage: leverage
      })

      // Place stop loss and take profit orders
      let stopLossOrderId = null
      let takeProfitOrderId = null

      try {
        if (decision.stopLoss) {
          console.log(`${aiData.name}: Placing STOP LOSS @ $${decision.stopLoss}`)
          const slOrder = await api.placeStopLoss(symbol, decision.action, parseFloat(quantityFormatted), decision.stopLoss)
          stopLossOrderId = slOrder.orderId
          console.log(`${aiData.name}: Stop loss order placed (ID: ${stopLossOrderId})`)
        }

        if (decision.takeProfit) {
          console.log(`${aiData.name}: Placing TAKE PROFIT @ $${decision.takeProfit}`)
          const tpOrder = await api.placeTakeProfit(symbol, decision.action, parseFloat(quantityFormatted), decision.takeProfit)
          takeProfitOrderId = tpOrder.orderId
          console.log(`${aiData.name}: Take profit order placed (ID: ${takeProfitOrderId})`)
        }
      } catch (slTpError) {
        console.error(`${aiData.name}: Error placing SL/TP orders:`, slTpError.message)
      }

      // Create position record
      const positionId = `${aiId}_${symbol}_${Date.now()}`
      await updatePosition(positionId, {
        ai_id: aiId,
        ai_name: aiData.name,
        symbol,
        side: decision.action,
        quantity: quantity,
        leverage: leverage,
        collateral: collateralUSD,
        notional: notionalValue,
        entry_price: entryPrice,
        mark_price: entryPrice,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
        entry_time: Date.now(),
        stop_loss: decision.stopLoss || null,
        take_profit: decision.takeProfit || null,
        stop_loss_order_id: stopLossOrderId,
        take_profit_order_id: takeProfitOrderId
      })

      // Update AI trader with conversational message
      await updateAITrader(aiId, {
        last_decision: decision.message || decision.reasoning
      })

      // Log trade
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'OPEN',
        symbol,
        side: decision.action,
        quantity: quantity,
        leverage: leverage,
        entry_price: entryPrice,
        notional: notionalValue,
        collateral: collateralUSD,
        reasoning: decision.reasoning || decision.message || 'Position opened',
        message: decision.message || decision.reasoning || 'Position opened'
      })

      console.log(`${aiData.name}: ${decision.action} ${symbol} @ $${entryPrice} | Notional: $${notionalValue.toFixed(2)}`)
    }
  } catch (error) {
    console.error(`Error executing ${aiData.name}'s decision:`, error.message)
  }
}

// Update unrealized P&L for all positions
export async function updateUnrealizedPnL() {
  try {
    const positions = await getAllPositions()

    for (const [positionId, position] of Object.entries(positions)) {
      const api = asterAPIs[position.ai_id]
      if (!api) continue

      // Get current price
      const currentPrice = await api.getPrice(position.symbol)
      const markPrice = parseFloat(currentPrice.price)

      // Calculate unrealized PnL
      const priceDiff = position.side === 'LONG'
        ? markPrice - position.entry_price
        : position.entry_price - markPrice

      // Use notional instead of size for P&L calculation
      const positionValue = position.notional || 0
      const unrealizedPnl = (priceDiff / position.entry_price) * positionValue
      const unrealizedPnlPercent = (priceDiff / position.entry_price) * 100

      // Ensure no NaN values
      const validUnrealizedPnl = isNaN(unrealizedPnl) || !isFinite(unrealizedPnl) ? 0 : unrealizedPnl
      const validUnrealizedPnlPercent = isNaN(unrealizedPnlPercent) || !isFinite(unrealizedPnlPercent) ? 0 : unrealizedPnlPercent

      // Update position
      await updatePosition(positionId, {
        ...position,
        mark_price: markPrice,
        unrealized_pnl: validUnrealizedPnl,
        unrealized_pnl_percent: validUnrealizedPnlPercent
      })
    }
  } catch (error) {
    console.error('Error updating unrealized P&L:', error.message)
  }
}

// Main trading loop for one AI
export async function runAITradingCycle(aiId) {
  try {
    console.log(`\n🤖 Running trading cycle for ${AI_PERSONAS[aiId].name}...`)

    const api = asterAPIs[aiId]
    const aiData = await getAITrader(aiId)

    // Get account balance from Aster
    const balanceData = await api.getBalance()
    const usdtBalance = balanceData.find(b => b.asset === 'USDT')
    // Use 'balance' (total wallet balance) not 'availableBalance' (which excludes margins in positions)
    const actualBalance = parseFloat(usdtBalance?.balance || aiData.balance)

    // Get current positions
    const allPositions = await getAllPositions()
    const aiPositions = Object.values(allPositions).filter(p => p.ai_id === aiId)

    // Calculate total return
    const initialBalance = 500 // Each AI starts with $500
    // Note: actualBalance from Aster API already includes margin but NOT unrealized P&L
    // So we need to add unrealized P&L from positions to get true account value
    const unrealizedPnL = aiPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
    const accountValue = actualBalance + unrealizedPnL
    const totalReturn = ((accountValue - initialBalance) / initialBalance) * 100

    // Update balance and total return
    await updateAITrader(aiId, {
      balance: actualBalance,
      total_return: totalReturn
    })

    // STORE BALANCE SNAPSHOT (historical)
    await storeBalanceSnapshot(aiId, {
      balance: actualBalance,
      unrealized_pnl: unrealizedPnL,
      account_value: accountValue,
      total_return: totalReturn,
      positions_count: aiPositions.length
    })

    // Get market data
    const marketData = await updateMarketDataJob()

    // Get available symbols
    const exchangeInfo = await api.getExchangeInfo()
    const availableSymbols = exchangeInfo.symbols
      .filter(s => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT')
      .map(s => s.symbol)

    // Get technical analysis for top traded symbols
    console.log(`📊 Fetching technical analysis...`)
    const topSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']
    const technicalAnalysis = await getMultiSymbolAnalysis(api, topSymbols)

    // STORE TECHNICAL SNAPSHOT (historical)
    await storeTechnicalSnapshot(topSymbols, technicalAnalysis)

    // Get AI decision with technical analysis
    const decision = await getAIDecision(aiId, {
      balance: actualBalance,
      positions: aiPositions,
      marketData,
      availableSymbols,
      technicalAnalysis,
      totalReturn
    })

    console.log(`${aiData.name} decision:`, decision)

    // STORE TRADING DECISION (historical)
    await storeTradingDecision(aiId, decision, {
      balance: actualBalance,
      totalReturn,
      positions: aiPositions
    })

    // Save the AI's conversational message to last_decision
    if (decision.message) {
      await updateAITrader(aiId, { last_decision: decision.message })
    }

    // Execute decision
    await executeDecision(aiId, decision)

    // Update PnL history
    await updatePnLHistory(aiId, accountValue)

    console.log(`✅ ${aiData.name} cycle complete`)
  } catch (error) {
    console.error(`Error in ${aiId} trading cycle:`, error.message)
  }
}

// Update all account balances from Aster (lightweight, runs every 10s)
export async function updateAllBalances() {
  try {
    for (const aiId of Object.keys(AI_PERSONAS)) {
      const api = asterAPIs[aiId]
      const aiData = await getAITrader(aiId)

      // Get account balance from Aster
      const balanceData = await api.getBalance()
      const usdtBalance = balanceData.find(b => b.asset === 'USDT')
      const actualBalance = parseFloat(usdtBalance?.balance || aiData.balance)

      // Get positions for unrealized P&L
      const allPositions = await getAllPositions()
      const aiPositions = Object.values(allPositions).filter(p => p.ai_id === aiId)
      const unrealizedPnL = aiPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
      const accountValue = actualBalance + unrealizedPnL

      // Update balance in Firebase
      await updateAITrader(aiId, {
        balance: actualBalance
      })

      // Update PnL history
      await updatePnLHistory(aiId, accountValue)
    }
  } catch (error) {
    console.error('Error updating balances:', error.message)
  }
}

// Run all AI traders
export async function runAllAITraders() {
  console.log('\n' + '='.repeat(50))
  console.log('🎯 TRADING CYCLE STARTED')
  console.log('='.repeat(50))

  // Update market data first
  await updateMarketDataJob()

  // Update unrealized P&L
  await updateUnrealizedPnL()

  // Run each AI sequentially to avoid rate limits
  for (const aiId of Object.keys(AI_PERSONAS)) {
    await runAITradingCycle(aiId)
    // Small delay between AIs
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ TRADING CYCLE COMPLETE')
  console.log('='.repeat(50) + '\n')
}
