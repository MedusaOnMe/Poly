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

// Cache for symbol precision info
const symbolPrecisionCache = {}

// Fetch and cache exchange info for precision
async function initializeSymbolPrecisions() {
  try {
    const api = Object.values(asterAPIs)[0]
    if (!api) return

    const exchangeInfo = await api.getExchangeInfo()

    if (exchangeInfo && exchangeInfo.symbols) {
      for (const symbolInfo of exchangeInfo.symbols) {
        // Store quantity precision (quantityPrecision is the number of decimals allowed)
        symbolPrecisionCache[symbolInfo.symbol] = {
          quantityPrecision: symbolInfo.quantityPrecision || 3,
          pricePrecision: symbolInfo.pricePrecision || 2
        }
      }
      console.log(`✅ Cached precision info for ${Object.keys(symbolPrecisionCache).length} symbols`)
    }
  } catch (error) {
    console.error('Error initializing symbol precisions:', error.message)
  }
}

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

  // Initialize symbol precision cache
  await initializeSymbolPrecisions()
}

// Close positions that have exceeded their time limits
export async function closeExpiredPositions() {
  try {
    const positions = await getAllPositions()
    const now = Date.now()

    // Time limits in milliseconds
    const TIME_LIMITS = {
      gpt: 45 * 60 * 1000,       // 45 minutes
      claude: 45 * 60 * 1000,    // 45 minutes
      deepseek: 5 * 60 * 1000,   // 5 minutes (scalper)
      grok: 45 * 60 * 1000       // 45 minutes
    }

    for (const [positionId, position] of Object.entries(positions)) {
      const aiId = position.ai_id
      const timeLimit = TIME_LIMITS[aiId] || 30 * 60 * 1000 // default 30 min
      const holdingTime = now - (position.entry_time || now)

      if (holdingTime > timeLimit) {
        console.log(`⏰ ${position.ai_name}: Closing ${position.symbol} - exceeded ${timeLimit / 60000} min time limit`)

        const api = asterAPIs[aiId]
        if (!api) continue

        try {
          // Get current price
          const currentPrice = await api.getPrice(position.symbol)
          const exitPrice = parseFloat(currentPrice.price)

          // Close position with correct precision
          const precision = getQuantityPrecision(position.symbol)
          const quantityToClose = position.quantity ? position.quantity.toFixed(precision) : '0'
          await api.closePosition(position.symbol, position.side, quantityToClose)

          // Calculate P&L
          const priceDiff = position.side === 'LONG'
            ? exitPrice - position.entry_price
            : position.entry_price - exitPrice
          const pnlPercent = (priceDiff / position.entry_price) * 100
          const pnl = (pnlPercent / 100) * position.notional

          // Calculate holding time display
          const holdingTimeMs = now - position.entry_time
          const holdingHours = Math.floor(holdingTimeMs / 3600000)
          const holdingMins = Math.floor((holdingTimeMs % 3600000) / 60000)
          const holdingTimeStr = `${holdingHours}H ${holdingMins}M`

          // Update AI balance
          const aiData = await getAITrader(aiId)
          await updateAITrader(aiId, {
            balance: aiData.balance + pnl
          })

          // Remove position
          await removePosition(positionId)

          // Log completed trade
          await logTrade({
            ai_id: aiId,
            ai_name: position.ai_name,
            action: 'COMPLETED',
            symbol: position.symbol,
            side: position.side,
            quantity: position.quantity,
            leverage: position.leverage,
            entry_price: position.entry_price,
            exit_price: exitPrice,
            notional_entry: position.notional,
            notional_exit: position.quantity * exitPrice,
            pnl: pnl,
            holding_time: holdingTimeStr,
            reasoning: `Auto-closed after ${holdingTimeStr} (time limit exceeded)`,
            message: `Closed ${position.symbol} ${position.side} at $${exitPrice.toFixed(2)} after ${holdingTimeStr}. P&L: $${pnl.toFixed(2)}`
          })

          console.log(`✅ ${position.ai_name}: Closed ${position.symbol} - P&L: $${pnl.toFixed(2)}`)
        } catch (error) {
          console.error(`Error closing expired position for ${position.ai_name}:`, error.message)
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired positions:', error.message)
  }
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
  // Use cached precision if available, but apply smart minimum based on asset value
  const exchangePrecision = symbolPrecisionCache[symbol]?.quantityPrecision

  if (exchangePrecision !== undefined) {
    // For expensive assets, we need MORE decimals to represent minimum $110 notional
    // Override precision based on typical asset value ranges
    if (symbol.includes('BTC')) {
      return Math.max(exchangePrecision, 3)  // BTC needs at least 3 decimals (0.001 = ~$107)
    } else if (symbol.includes('ETH')) {
      return Math.max(exchangePrecision, 2)  // ETH needs at least 2 decimals (0.03 = ~$105)
    } else if (symbol.includes('BNB')) {
      return Math.max(exchangePrecision, 2)  // BNB needs at least 2 decimals (0.11 = ~$110)
    } else if (symbol.includes('SOL')) {
      return Math.max(exchangePrecision, 1)  // SOL needs at least 1 decimal (0.6 = ~$108)
    }

    // For cheaper altcoins, use exchange precision
    return exchangePrecision
  }

  // Fallback to default precision (should rarely hit this)
  console.warn(`⚠️  No cached precision for ${symbol}, using default 3`)
  return 3
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
        const exitPrice = parseFloat(currentPrice?.price || 0)

        // Calculate PnL with leverage (with defensive checks)
        const entryPrice = position.entry_price || 0
        const notional = position.notional || 0

        const priceDiff = position.side === 'LONG'
          ? exitPrice - entryPrice
          : entryPrice - exitPrice
        const pnlPercent = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0
        const pnl = notional > 0 ? (pnlPercent / 100) * notional : 0

        // Calculate holding time
        const holdingTimeMs = Date.now() - (position.entry_time || Date.now())
        const holdingHours = Math.floor(holdingTimeMs / 3600000)
        const holdingMins = Math.floor((holdingTimeMs % 3600000) / 60000)
        const holdingTime = `${holdingHours}H ${holdingMins}M`

        // Close position on exchange with correct precision
        const precision = getQuantityPrecision(position.symbol)
        const quantityToClose = position.quantity ? position.quantity.toFixed(precision) : '0'
        await api.closePosition(position.symbol, position.side, quantityToClose)

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

        console.log(`${aiData.name}: CLOSED ${position.side} ${position.symbol} | Entry: $${entryPrice.toFixed(2)} → Exit: $${exitPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Held: ${holdingTime}`)
      }
      return
    }

    // LONG or SHORT action
    if (decision.action === 'LONG' || decision.action === 'SHORT') {
      const { symbol, size, leverage = 10 } = decision

      // Validate balance
      if (aiData.balance <= 0) {
        console.log(`${aiData.name}: Cannot trade with zero balance`)

        // Log as HOLD since we can't execute the trade
        await logTrade({
          ai_id: aiId,
          ai_name: aiData.name,
          action: 'HOLD',
          reasoning: `Cannot execute ${decision.action} on ${symbol}: Insufficient balance`,
          message: decision.message || `Wanted to ${decision.action} ${symbol}, but insufficient balance prevented execution.`
        })

        return
      }

      // Get current price
      const currentPrice = await api.getPrice(symbol)
      const entryPrice = parseFloat(currentPrice?.price || 0)

      // Validate we have a valid price
      if (!entryPrice || entryPrice <= 0 || !isFinite(entryPrice)) {
        console.log(`${aiData.name}: Invalid entry price ${entryPrice} for ${symbol}, skipping`)
        return
      }

      // Calculate position size properly:
      // 1. Determine how much of balance to use (AI suggests 'size' in USD, cap at 70% of balance)
      const collateralUSD = Math.min(size || aiData.balance * 0.5, aiData.balance * 0.7)

      // Validate collateral is a valid number
      if (!collateralUSD || collateralUSD <= 0 || !isFinite(collateralUSD)) {
        console.log(`${aiData.name}: Invalid collateral ${collateralUSD} for ${symbol}, skipping`)
        return
      }

      // 2. Calculate notional position value with leverage
      const notionalValue = collateralUSD * leverage

      // Minimum notional value requirement (110 USD after leverage)
      const MIN_NOTIONAL_USD = 110

      // Check if notional value meets minimum requirement
      if (notionalValue < MIN_NOTIONAL_USD) {
        console.log(`${aiData.name}: Notional value $${notionalValue.toFixed(2)} below minimum $${MIN_NOTIONAL_USD}, skipping`)

        // Log as HOLD since we can't execute the trade
        await logTrade({
          ai_id: aiId,
          ai_name: aiData.name,
          action: 'HOLD',
          reasoning: `Cannot execute ${decision.action} on ${symbol}: Position size $${notionalValue.toFixed(2)} below minimum $${MIN_NOTIONAL_USD}`,
          message: decision.message || `Wanted to ${decision.action} ${symbol}, but position size too small.`
        })

        return
      }

      // 3. Convert to coin quantity
      const quantity = notionalValue / entryPrice

      // Validate quantity is positive and finite
      if (!quantity || quantity <= 0 || !isFinite(quantity)) {
        console.log(`${aiData.name}: Invalid quantity ${quantity} for ${symbol}, skipping`)
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

    // Log the failed trade so it shows in model chat
    try {
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'HOLD',
        reasoning: `Trade failed: ${error.message}`,
        message: decision.message || `Wanted to ${decision.action}, but trade execution failed.`
      })
    } catch (logError) {
      console.error(`Error logging failed trade:`, logError.message)
    }
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

    // Get futures account info from Aster
    const accountData = await api.getAccount()

    // Calculate actual account balance: BNB + USDT + Unrealized P&L
    let actualBalance = 0

    // Get BNB asset and convert to USD at current market price (real-time)
    const bnbAsset = accountData.assets?.find(a => a.asset === 'BNB')
    if (bnbAsset && parseFloat(bnbAsset.walletBalance) !== 0) {
      const bnbPrice = await api.getPrice('BNBUSDT')
      const bnbPriceUSD = parseFloat(bnbPrice.price)
      const bnbBalance = parseFloat(bnbAsset.walletBalance)
      const bnbValueUSD = bnbBalance * bnbPriceUSD
      actualBalance += bnbValueUSD
    }

    // Add USDT wallet balance (may be negative if used as margin)
    const usdtAsset = accountData.assets?.find(a => a.asset === 'USDT')
    if (usdtAsset) {
      const usdtBalance = parseFloat(usdtAsset.walletBalance || 0)
      actualBalance += usdtBalance
    }

    // Add unrealized P&L (increases if positive, decreases if negative)
    const unrealizedPnL = parseFloat(accountData?.totalUnrealizedProfit || 0)
    actualBalance += unrealizedPnL

    // Get current positions
    const allPositions = await getAllPositions()
    const aiPositions = Object.values(allPositions).filter(p => p.ai_id === aiId)

    // Calculate total return (actualBalance already includes unrealized P&L)
    const initialBalance = 500 // Each AI starts with $500
    const totalReturn = ((actualBalance - initialBalance) / initialBalance) * 100

    // Update balance and total return
    await updateAITrader(aiId, {
      balance: actualBalance,
      total_return: totalReturn
    })

    // STORE BALANCE SNAPSHOT (historical)
    // actualBalance now includes unrealized P&L, so for historical tracking:
    // - wallet balance (without P&L) = actualBalance - unrealizedPnL
    // - account_value (with P&L) = actualBalance
    const walletBalance = actualBalance - unrealizedPnL
    await storeBalanceSnapshot(aiId, {
      balance: walletBalance,
      unrealized_pnl: unrealizedPnL,
      account_value: actualBalance,
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

    // Update PnL history (actualBalance already includes unrealized P&L)
    await updatePnLHistory(aiId, actualBalance)

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

      // Get futures account info from Aster
      const accountData = await api.getAccount()

      // Calculate actual account balance: BNB + USDT + Unrealized P&L
      let actualBalance = 0

      // Get BNB asset and convert to USD at current market price (real-time)
      const bnbAsset = accountData.assets?.find(a => a.asset === 'BNB')
      if (bnbAsset && parseFloat(bnbAsset.walletBalance) !== 0) {
        const bnbPrice = await api.getPrice('BNBUSDT')
        const bnbPriceUSD = parseFloat(bnbPrice.price)
        const bnbBalance = parseFloat(bnbAsset.walletBalance)
        const bnbValueUSD = bnbBalance * bnbPriceUSD
        actualBalance += bnbValueUSD
      }

      // Add USDT wallet balance (may be negative if used as margin)
      const usdtAsset = accountData.assets?.find(a => a.asset === 'USDT')
      if (usdtAsset) {
        const usdtBalance = parseFloat(usdtAsset.walletBalance || 0)
        actualBalance += usdtBalance
      }

      // Add unrealized P&L (increases if positive, decreases if negative)
      const unrealizedPnL = parseFloat(accountData?.totalUnrealizedProfit || 0)
      actualBalance += unrealizedPnL

      // Update balance in Firebase
      await updateAITrader(aiId, {
        balance: actualBalance
      })

      // Update PnL history (actualBalance already includes unrealized P&L)
      await updatePnLHistory(aiId, actualBalance)
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
