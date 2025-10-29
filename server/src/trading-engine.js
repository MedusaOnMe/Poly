import { PolymarketAPI } from './polymarket-api.js'
import { AI_PERSONAS, getAIDecision } from './ai-traders.js'
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
  storeTradingDecision
} from './firebase.js'

// Store Polymarket API instances for each AI
const polymarketAPIs = {}

// Cache for market data
let cachedMarkets = []
let lastMarketFetch = 0
const MARKET_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Initialize Polymarket API clients
export async function initializeAPIs(walletConfigs) {
  for (const [index, aiId] of Object.keys(AI_PERSONAS).entries()) {
    const { privateKey, funder, proxy } = walletConfigs[index]

    polymarketAPIs[aiId] = new PolymarketAPI(privateKey, funder, proxy)

    try {
      await polymarketAPIs[aiId].initialize()
      console.log(`✅ ${aiId}: Polymarket client initialized`)
    } catch (error) {
      console.error(`❌ ${aiId}: Failed to initialize Polymarket client:`, error.message)
    }
  }

  console.log('✅ Polymarket API clients initialized for all AI traders')
}

// Fetch and cache active prediction markets
export async function updateMarketDataJob() {
  try {
    const now = Date.now()

    // Use cached markets if recent
    if (cachedMarkets.length > 0 && (now - lastMarketFetch) < MARKET_CACHE_DURATION) {
      console.log(`📊 Using cached markets (${cachedMarkets.length} markets)`)
      return cachedMarkets
    }

    // Fetch fresh market data from any API instance
    const api = Object.values(polymarketAPIs)[0]
    if (!api || !api.isInitialized()) {
      console.log('⚠️  No initialized Polymarket API available')
      return []
    }

    const markets = await api.getActiveMarkets({
      limit: 200,         // Get 200 active markets (4x more options)
      minVolume: 1000,    // $1k minimum volume (lower barrier)
      minLiquidity: 5000  // $5k minimum liquidity (more accessible)
    })

    cachedMarkets = markets
    lastMarketFetch = now

    // Update Firebase with top markets for ticker display
    const tickerData = markets.slice(0, 20).map((market, index) => ({
      index,
      market_id: market.id,
      question: market.question,
      yes_price: market.yes_price,
      no_price: market.no_price,
      volume_24h: market.volume_24h,
      liquidity: market.liquidity,
      category: market.category,
      resolution_date: market.end_date,
      active: market.active
    }))

    await updateMarketData(tickerData)

    console.log(`📊 Market data updated: ${markets.length} active prediction markets`)

    return markets
  } catch (error) {
    console.error('Error updating market data:', error.message)
    return cachedMarkets // Return cached markets on error
  }
}

// Update unrealized P&L for all open positions (now uses Data API for accurate real-time prices)
export async function updateUnrealizedPnL() {
  try {
    const firebasePositions = await getAllPositions()
    let updatedCount = 0

    for (const [positionId, position] of Object.entries(firebasePositions)) {
      try {
        const api = polymarketAPIs[position.ai_id]
        if (!api || !api.isInitialized()) continue

        // Get real-time positions from Data API (has accurate current prices)
        const dataApiPositions = await api.getUserPositions()

        // Match by token_id (Data API calls it 'asset', Firebase has 'token_id')
        const dataPosition = dataApiPositions.find(p => p.asset === position.token_id)

        if (!dataPosition) {
          // Position no longer exists (was closed or expired)
          console.log(`   Position ${positionId} not found in Data API, skipping update`)
          continue
        }

        // Use current price from Data API (Data API calls it 'curPrice')
        const currentPrice = dataPosition.curPrice || position.entry_price

        // Calculate unrealized P&L using ACTUAL cost_basis (includes fees/slippage)
        // DO NOT recalculate from shares * entry_price - that ignores what we actually paid
        const costBasis = position.cost_basis || (position.shares * position.entry_price)
        const currentValue = position.shares * currentPrice
        const unrealizedPnL = currentValue - costBasis
        const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0

        // Update position in Firebase
        await updatePosition(positionId, {
          current_price: currentPrice,
          current_value: currentValue,
          unrealized_pnl: unrealizedPnL,
          unrealized_pnl_percent: unrealizedPnLPercent,
          last_update: Date.now()
        })

        updatedCount++
      } catch (error) {
        console.error(`Error updating P&L for position ${positionId}:`, error.message)
      }
    }

    console.log(`💰 Updated unrealized P&L for ${updatedCount} positions`)
  } catch (error) {
    console.error('Error updating unrealized P&L:', error.message)
  }
}

// Update AI balances (lightweight balance check)
export async function updateAllBalances() {
  try {
    for (const aiId of Object.keys(AI_PERSONAS)) {
      const api = polymarketAPIs[aiId]
      if (!api || !api.isInitialized()) continue

      const aiData = await getAITrader(aiId)

      // Get REAL USDC balance from proxy wallet
      const realBalance = await api.getProxyUSDCBalance()

      // Get REAL positions from Data API
      const dataApiPositions = await api.getUserPositions()
      console.log(`${aiData.name}: Found ${dataApiPositions.length} positions from Data API`)

      // Data API fields: currentValue (position value), cashPnl (unrealized P&L)
      const positionsValue = dataApiPositions.reduce((sum, p) => sum + parseFloat(p.currentValue || 0), 0)
      const unrealizedPnL = dataApiPositions.reduce((sum, p) => sum + parseFloat(p.cashPnl || 0), 0)

      // Total portfolio value = liquid USDC + positions value
      const portfolioValue = realBalance + positionsValue

      console.log(`${aiData.name}: Cash=$${realBalance.toFixed(2)}, Positions=$${positionsValue.toFixed(2)}, Total=$${portfolioValue.toFixed(2)}`)

      // Calculate total return
      const totalReturn = ((portfolioValue - aiData.initial_balance) / aiData.initial_balance) * 100

      // Update Firebase
      await updateAITrader(aiId, {
        balance: realBalance,
        account_value: portfolioValue,
        unrealized_pnl: unrealizedPnL,
        total_return: totalReturn,
        last_update: Date.now()
      })

      // Store portfolio value in P&L history for chart (every 20 seconds)
      await updatePnLHistory(aiId, portfolioValue)
    }

    console.log('💵 Updated all AI balances')
  } catch (error) {
    console.error('Error updating balances:', error.message)
  }
}

// Execute AI trading decision
async function executeDecision(aiId, decision, analyzedMarket, realBalance, dataApiPositions = []) {
  const api = polymarketAPIs[aiId]
  const aiData = await getAITrader(aiId)

  if (!aiData) {
    console.error(`❌ ${aiId}: Failed to fetch AI data in executeDecision`)
    return
  }

  // Use real balance from Data API if provided, otherwise fall back to Firebase
  const balance = realBalance !== undefined ? realBalance : aiData.balance

  try {
    if (decision.action === 'PASS') {
      console.log(`${aiData.name}: PASS - ${decision.message || decision.reasoning}`)

      // Update AI trader with conversational message
      await updateAITrader(aiId, {
        last_decision: decision.message || decision.reasoning
      })

      // Log PASS decision (include market being analyzed)
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'PASS',
        market_question: analyzedMarket?.question || null,
        reasoning: decision.reasoning || decision.message || 'No action this cycle',
        message: decision.message || decision.reasoning || 'No action this cycle',
        research: decision.research || null
      })

      return
    }

    if (decision.action === 'SELL') {
      // Find position to close from Data API positions (real on-chain data)
      const position = dataApiPositions.find(pos => pos.market_id === decision.market_id)

      if (!position) {
        console.log(`${aiData.name}: No position found for market ${decision.market_id}`)
        return
      }

      // Also find Firebase position for cleanup
      const allFirebasePositions = await getAllPositions()
      const firebasePosition = Object.entries(allFirebasePositions).find(
        ([id, pos]) => pos.ai_id === aiId && pos.market_id === decision.market_id
      )
      const positionId = firebasePosition ? firebasePosition[0] : null

      // Use current price from Data API position (already available)
      const currentPrice = position.current_price || position.entry_price

      console.log(`${aiData.name}: Selling ${position.outcome} on "${position.market_question}" at current price $${currentPrice.toFixed(3)}`)

      // Calculate P&L
      const costBasis = position.shares * position.entry_price
      const proceeds = position.shares * currentPrice
      const pnl = proceeds - costBasis
      const pnlPercent = (pnl / costBasis) * 100

      // Calculate holding time
      const holdingTimeMs = Date.now() - position.entry_time
      const holdingHours = Math.floor(holdingTimeMs / 3600000)
      const holdingMins = Math.floor((holdingTimeMs % 3600000) / 60000)
      const holdingDays = Math.floor(holdingHours / 24)
      const remainingHours = holdingHours % 24
      const holdingTime = holdingDays > 0
        ? `${holdingDays}D ${remainingHours}H`
        : `${holdingHours}H ${holdingMins}M`

      // Sell shares on Polymarket with current market price
      await api.sellShares(position.token_id, position.shares, currentPrice)

      // Update balance (estimated - will sync with Data API next cycle)
      const newBalance = balance + proceeds
      await updateAITrader(aiId, {
        balance: newBalance,
        total_trades: aiData.total_trades + 1,
        wins: pnl > 0 ? aiData.wins + 1 : aiData.wins,
        losses: pnl <= 0 ? (aiData.losses || 0) + 1 : aiData.losses || 0,
        last_decision: decision.message || decision.reasoning
      })

      // Log completed trade
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'SELL',
        market_id: position.market_id,
        market_question: position.market_question,
        outcome: position.outcome,
        shares: position.shares,
        entry_price: position.entry_price,
        exit_price: currentPrice,
        cost: costBasis,
        proceeds: proceeds,
        pnl: pnl,
        pnl_percent: pnlPercent,
        holding_time: holdingTime,
        holding_time_ms: holdingTimeMs,
        reasoning: decision.reasoning || decision.message || 'Position sold',
        message: decision.message || decision.reasoning || 'Position sold',
        research: decision.research || null
      })

      // Remove position from Firebase if it was tracked there
      if (positionId) {
        await removePosition(positionId)
      }

      console.log(`${aiData.name}: SOLD ${position.outcome} on "${position.market_question}" | Entry: $${position.entry_price.toFixed(3)} → Exit: $${currentPrice.toFixed(3)} | P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Held: ${holdingTime}`)

      // Wait 15 seconds for Data API to propagate the position closure
      console.log(`${aiData.name}: Waiting 15s for Data API to update...`)
      await new Promise(resolve => setTimeout(resolve, 15000))

      return
    }

    // BUY action
    if (decision.action === 'BUY') {
      let { market_id, outcome, amount } = decision

      // Enforce $35 max position size cap
      const MAX_POSITION_SIZE = 35
      if (amount > MAX_POSITION_SIZE) {
        console.log(`${aiData.name}: Position size capped from $${amount} to $${MAX_POSITION_SIZE}`)
        amount = MAX_POSITION_SIZE
      }

      // Validate balance (use REAL balance from Data API)
      if (balance <= 0 || amount > balance) {
        console.log(`${aiData.name}: Insufficient balance for trade (Real: $${balance.toFixed(2)} < Required: $${amount})`)

        await logTrade({
          ai_id: aiId,
          ai_name: aiData.name,
          action: 'PASS',
          market_question: analyzedMarket?.question || null,
          reasoning: `Cannot execute BUY: Insufficient balance ($${balance.toFixed(2)} < $${amount})`,
          message: decision.message || `Wanted to buy ${outcome}, but insufficient balance.`,
          research: decision.research || null
        })

        return
      }

      // Find market in cached markets
      const market = cachedMarkets.find(m => m.id === market_id)
      if (!market) {
        console.log(`${aiData.name}: Market ${market_id} not found`)
        return
      }

      // Get token ID based on outcome - match outcome name to outcomes array
      // Ensure outcomes is an array
      let outcomes = market.outcomes
      if (!Array.isArray(outcomes)) {
        if (typeof outcomes === 'string') {
          try {
            outcomes = JSON.parse(outcomes)
          } catch {
            outcomes = ['Yes', 'No']
          }
        } else {
          outcomes = ['Yes', 'No']
        }
      }

      console.log(`${aiData.name}: 🔍 DEBUG - Market: "${market.question}"`)
      console.log(`  Outcomes: ${JSON.stringify(outcomes)}`)
      console.log(`  Outcome Prices: ${JSON.stringify(market.outcomePrices)}`)
      console.log(`  Token IDs: ${JSON.stringify(market.token_ids)}`)
      console.log(`  Trying to buy: ${outcome}`)

      const outcomeIndex = outcomes.findIndex(o =>
        o.toLowerCase() === outcome.toLowerCase()
      )

      if (outcomeIndex === -1) {
        console.log(`${aiData.name}: ❌ Outcome "${outcome}" not found in market outcomes: [${outcomes.join(', ')}]`)
        return
      }

      const tokenId = market.token_ids[outcomeIndex]

      if (!tokenId) {
        console.log(`${aiData.name}: ❌ Token ID not found for ${outcome} outcome at index ${outcomeIndex}`)
        console.log(`  Market outcomes: [${outcomes.join(', ')}]`)
        console.log(`  Token IDs: [${market.token_ids.join(', ')}]`)
        return
      }

      // Get current price from market data (already fetched)
      const entryPrice = market.outcomePrices?.[outcomeIndex]

      if (!entryPrice || isNaN(entryPrice) || !isFinite(entryPrice)) {
        console.log(`${aiData.name}: ❌ Invalid price for ${outcome} at index ${outcomeIndex}: ${entryPrice}`)
        return
      }

      console.log(`${aiData.name}: ✅ Buying ${outcome} at price $${entryPrice.toFixed(3)} (token ${tokenId.substring(0, 20)}...)`)

      // Validate price is within Polymarket's tradeable range (0.01 to 0.99)
      // Use conservative limits to avoid edge cases
      if (entryPrice < 0.02 || entryPrice > 0.98) {
        console.log(`${aiData.name}: Price ${entryPrice} is outside tradeable range (0.02-0.98) - skipping trade`)

        await logTrade({
          ai_id: aiId,
          ai_name: aiData.name,
          action: 'PASS',
          market_question: market.question,
          reasoning: `Cannot execute BUY: Price ${entryPrice.toFixed(3)} is outside tradeable range`,
          message: decision.message || `Wanted to buy ${outcome}, but price too extreme.`,
          research: decision.research || null
        })

        return
      }

      // Calculate shares to buy
      const shares = Math.floor(amount / entryPrice)

      if (shares <= 0) {
        console.log(`${aiData.name}: Amount too small to buy shares`)
        return
      }

      const actualCost = shares * entryPrice

      // Buy shares on Polymarket with current market price
      await api.buyShares(tokenId, actualCost, entryPrice)

      // Update balance (estimated - will sync with Data API next cycle)
      const newBalance = balance - actualCost
      await updateAITrader(aiId, {
        balance: newBalance,
        last_decision: decision.message || decision.reasoning
      })

      // Create position in Firebase
      const positionId = `${aiId}_${market_id}_${Date.now()}`
      await updatePosition(positionId, {
        ai_id: aiId,
        ai_name: aiData.name,
        market_id: market_id,
        market_question: market.question,
        outcome: outcome.toUpperCase(),
        shares: shares,
        entry_price: entryPrice,
        current_price: entryPrice,
        entry_time: Date.now(),
        cost_basis: actualCost,
        current_value: actualCost,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
        days_to_resolution: market.days_to_resolution,
        resolution_date: market.end_date,
        category: market.category,
        token_id: tokenId,
        last_update: Date.now()
      })

      // Log trade
      await logTrade({
        ai_id: aiId,
        ai_name: aiData.name,
        action: 'BUY',
        market_id: market_id,
        market_question: market.question,
        outcome: outcome.toUpperCase(),
        shares: shares,
        entry_price: entryPrice,
        cost: actualCost,
        reasoning: decision.reasoning || decision.message || 'Position opened',
        message: decision.message || decision.reasoning || 'Position opened',
        research: decision.research || null
      })

      console.log(`${aiData.name}: BOUGHT ${shares} ${outcome} shares on "${market.question}" @ $${entryPrice.toFixed(3)} | Cost: $${actualCost.toFixed(2)}`)

      // Wait 15 seconds for Data API to propagate the new position
      console.log(`${aiData.name}: Waiting 15s for position to propagate on Data API...`)
      await new Promise(resolve => setTimeout(resolve, 15000))

      // Sync actual position values from Data API (true shares and entry price)
      try {
        const dataApiPositions = await api.getUserPositions()
        const actualPosition = dataApiPositions.find(p => p.asset === tokenId)

        if (actualPosition) {
          const actualShares = parseFloat(actualPosition.size || 0)
          const actualEntryPrice = parseFloat(actualPosition.averageCost || entryPrice)
          const actualCostBasis = parseFloat(actualPosition.totalCost || actualCost)

          console.log(`${aiData.name}: Syncing actual position values - Shares: ${shares} → ${actualShares}, Entry: $${entryPrice.toFixed(3)} → $${actualEntryPrice.toFixed(3)}`)

          await updatePosition(positionId, {
            shares: actualShares,
            entry_price: actualEntryPrice,
            cost_basis: actualCostBasis,
            current_value: actualShares * actualEntryPrice
          })
        } else {
          console.log(`${aiData.name}: ⚠️  Position not found in Data API yet, using estimated values`)
        }
      } catch (error) {
        console.error(`${aiData.name}: Error syncing position from Data API:`, error.message)
      }
    }

  } catch (error) {
    console.error(`${aiData.name}: Error executing decision:`, error.message)

    // Check if it's a liquidity/FOK error
    const isFOKError = error.message.includes('fully filled') || error.message.includes('FOK')
    const isLiquidityError = isFOKError || error.message.includes('liquidity')

    // Log error as PASS with appropriate message
    await logTrade({
      ai_id: aiId,
      ai_name: aiData.name,
      action: 'PASS',
      market_question: analyzedMarket?.question || null,
      reasoning: isLiquidityError
        ? `Insufficient market liquidity to fill order`
        : `Error executing trade: ${error.message}`,
      message: isLiquidityError
        ? `Tried to ${decision.action} but market liquidity too thin`
        : `Tried to ${decision.action} but encountered an error`,
      research: decision.research || null
    })
  }
}

// Main AI trading cycle
export async function runAITradingCycle(aiId) {
  try {
    const api = polymarketAPIs[aiId]

    if (!api || !api.isInitialized()) {
      console.log(`⚠️  ${aiId}: Polymarket API not initialized, skipping`)
      return
    }

    const aiData = await getAITrader(aiId)
    console.log(`\n🤖 ${aiData.name} TRADING CYCLE`)

    // Get current positions from Polymarket Data API (real on-chain data)
    const dataApiPositions = await api.getUserPositions()

    // Also get Firebase positions for comparison/logging
    const allPositions = await getAllPositions()
    const firebasePositions = Object.values(allPositions).filter(p => p.ai_id === aiId)

    // Map Data API positions to our format
    const aiPositions = dataApiPositions.map(pos => ({
      ai_id: aiId,
      ai_name: aiData.name,
      market_id: pos.market,
      market_question: pos.question || 'Unknown market',
      outcome: pos.side === 'YES' ? 'YES' : 'NO',
      shares: parseFloat(pos.size || 0),
      entry_price: parseFloat(pos.averageCost || 0),
      current_price: parseFloat(pos.currentPrice || 0),
      entry_time: pos.timestamp ? new Date(pos.timestamp).getTime() : Date.now(),
      cost_basis: parseFloat(pos.totalCost || 0),
      current_value: parseFloat(pos.value || 0),
      unrealized_pnl: parseFloat(pos.pnl || 0),
      unrealized_pnl_percent: parseFloat(pos.pnlPercent || 0),
      token_id: pos.tokenID || pos.asset_id,
      last_update: Date.now()
    }))

    console.log(`   📊 Data API Positions: ${aiPositions.length} | Firebase Positions: ${firebasePositions.length}`)

    // Don't sync Data API positions to Firebase - they lack market_id
    // Firebase positions are only created by our trading engine when orders execute
    // Data API positions are used for real-time P&L calculations only

    // Get real USDC balance from proxy wallet (on-chain, liquid)
    const realBalance = await api.getProxyUSDCBalance()

    // Calculate position values and unrealized P&L from Data API positions
    const positionsValue = aiPositions.reduce((sum, p) => sum + (p.current_value || 0), 0)
    const unrealizedPnL = aiPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)

    // Total portfolio value = liquid USDC + positions value
    const realPortfolioValue = realBalance + positionsValue

    // Calculate real return
    const realReturn = ((realPortfolioValue - aiData.initial_balance) / aiData.initial_balance) * 100

    console.log(`   💰 Liquid: $${realBalance.toFixed(2)} | Positions: $${positionsValue.toFixed(2)} | Portfolio: $${realPortfolioValue.toFixed(2)} | Return: ${realReturn.toFixed(2)}%`)

    // Randomly select 1 market for this AI (truly random selection from cached markets)
    let availableMarkets = []
    if (cachedMarkets.length > 0) {
      const randomIndex = Math.floor(Math.random() * cachedMarkets.length)
      const selectedMarket = cachedMarkets[randomIndex]
      if (selectedMarket && selectedMarket.id && selectedMarket.question) {
        availableMarkets = [selectedMarket]
      } else {
        console.log(`   ⚠️  Selected market at index ${randomIndex} is invalid, skipping cycle`)
      }
    } else {
      console.log(`   ⚠️  No cached markets available, skipping cycle`)
    }

    // Skip cycle if no valid markets
    if (availableMarkets.length === 0) {
      console.log(`✅ ${aiData.name}: Cycle complete (no markets to analyze)\n`)
      return
    }

    // Prepare context for AI decision (use REAL balance from Data API)
    // Use Firebase positions for AI (they have market metadata), not Data API positions (just prices)
    const marketContext = {
      balance: realBalance,
      totalReturn: aiData.total_return || 0,
      positions: firebasePositions,  // Firebase has market_id, market_question, etc.
      availableMarkets: availableMarkets
    }

    // Get AI decision
    console.log(`   Analyzing ${availableMarkets.length} new markets + ${firebasePositions.length} positions...`)
    const decision = await getAIDecision(aiId, marketContext)

    if (!decision || !decision.action) {
      console.error(`❌ ${aiData.name}: Invalid decision received`)
      return
    }

    console.log(`   Decision: ${decision.action} | ${decision.message || decision.reasoning}`)

    // Store trading decision with context (use Firebase positions - they have complete data with market_id)
    await storeTradingDecision(aiId, decision, {
      balance: realBalance,
      totalReturn: realReturn,
      positions_count: firebasePositions.length,
      positions: firebasePositions
    })

    // Execute decision (pass real balance, market being analyzed, and Data API positions)
    await executeDecision(aiId, decision, availableMarkets[0], realBalance, aiPositions)

    // HARD PROTECTION: Block any single update that swings >20% (likely API failure)
    const previousValue = aiData.account_value || aiData.balance || 0
    let skipBalanceUpdate = false
    if (previousValue > 0) {
      const percentChange = Math.abs((realPortfolioValue - previousValue) / previousValue) * 100
      if (percentChange > 20) {
        console.log(`⚠️  ${aiData.name}: BLOCKED ${percentChange.toFixed(1)}% swing in trading cycle ($${previousValue.toFixed(2)} → $${realPortfolioValue.toFixed(2)}) - likely API failure`)
        skipBalanceUpdate = true
      }
    }

    // Sync Firebase AI trader data with real values (unless blocked)
    if (!skipBalanceUpdate) {
      await updateAITrader(aiId, {
        balance: realBalance,
        account_value: realPortfolioValue,  // Total portfolio value (liquid + positions)
        unrealized_pnl: unrealizedPnL,
        total_return: realReturn,
        last_update: Date.now()
      })

      // Store balance snapshot (use REAL data from Data API) - only if not blocked
      await storeBalanceSnapshot(aiId, {
        balance: realBalance,
        unrealized_pnl: unrealizedPnL,
        account_value: realPortfolioValue,
        total_return: realReturn,
        positions_count: aiPositions.length
      })

      // Update P&L history (use REAL portfolio value) - only if not blocked
      await updatePnLHistory(aiId, realPortfolioValue)
    }

    console.log(`✅ ${aiData.name}: Cycle complete\n`)

  } catch (error) {
    console.error(`Error in ${aiId} trading cycle:`, error.message)
    console.error('Full error:', error)
    console.error('Stack trace:', error.stack)
  }
}

// Run all AI traders sequentially
export async function runAllAITraders() {
  console.log('\n🔄 STARTING AI TRADING CYCLE FOR ALL TRADERS\n')

  // Update market data first
  await updateMarketDataJob()

  // Update unrealized P&L before making decisions
  await updateUnrealizedPnL()

  // Run each AI trader with a delay between them
  for (const aiId of Object.keys(AI_PERSONAS)) {
    await runAITradingCycle(aiId)

    // Wait 2 seconds between AI traders to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('✅ ALL AI TRADING CYCLES COMPLETE\n')
}
