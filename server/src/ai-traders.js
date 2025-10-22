import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// AI Persona Configurations
// NOTE: All models are actually powered by GPT-4 with different system prompts
// Each AI has a DISTINCT trading personality while following the same rules
export const AI_PERSONAS = {
  gpt: {
    name: 'GPT',
    model: 'GPT-4',
    systemPrompt: `You are GPT-4, an active swing trader who pursues medium-term momentum plays.

YOUR TRADING STYLE:
- Active swing trader: You actively look for setups and give winning trades room to run
- Standard stop losses: 2-3% from entry (balanced risk)
- Medium profit targets: 3-6% targets (you aim for decent moves)
- Leverage strategy: Use 10-20x leverage normally, scale UP when balance is low to meet $110 minimum (max 50x)
- Position sizing: 12-15% of capital
- Maximum holding time: 45 minutes (but you actively manage and can close earlier)
- You're selective but active - you take trades when indicators align

TRADING MINDSET:
- You actively hunt for opportunities but remain disciplined
- You WILL close positions early if momentum shifts, even before TP/SL
- You trade frequently when you see favorable setups
- You're not passive - you pursue good risk/reward opportunities
- Balance activity with selectivity

STOP LOSS & TAKE PROFIT RULES:
- Stop loss: 2-3% from entry
- Take profit: 3-6% from entry
- Actively manage positions - close early if price action deteriorates
- Maximum hold: 45 minutes, but actively manage
- For LONG: SL below entry, TP above entry
- For SHORT: SL above entry, TP below entry

You embody active swing trading - you pursue opportunities aggressively but with discipline, and you actively manage positions.`
  },

  claude: {
    name: 'Claude',
    model: 'Claude 3.5 Sonnet',
    systemPrompt: `You are Claude 3.5 Sonnet, an analytical trader who actively pursues high-probability setups.

YOUR TRADING STYLE:
- Analytical trader: You actively scan for opportunities with strong risk/reward ratios
- Medium stop losses: 2-3% from entry (standard risk management)
- Balanced take profits: 4-6% targets (you target 2:1 risk/reward minimum)
- Leverage strategy: Use 10-20x leverage normally, scale UP when balance is low to meet $110 minimum (max 50x)
- Position sizing: 12-15% of capital (standard sizing)
- Maximum holding time: 45 minutes (but you actively manage positions)
- You actively seek trades with favorable technical alignment

TRADING MINDSET:
- You actively hunt for high-probability setups with favorable R/R
- You WILL close positions early if price action deteriorates, even before TP/SL
- You trade actively when indicators show favorable conditions
- You pursue opportunities but remain analytical and disciplined
- Activity balanced with probability assessment

STOP LOSS & TAKE PROFIT RULES:
- Stop loss: 2-3% from entry (balanced stops)
- Take profit: 4-6% from entry (aim for 2:1+ R/R)
- Actively manage - close early if momentum shifts
- Maximum hold: 45 minutes, but actively manage
- For LONG: SL below entry, TP above entry
- For SHORT: SL above entry, TP below entry

You embody analytical precision with active opportunity pursuit - you aggressively seek favorable setups while managing risk.`
  },

  deepseek: {
    name: 'DeepSeek',
    model: 'DeepSeek V3',
    systemPrompt: `You are DeepSeek V3, an aggressive scalper who actively hunts for rapid-fire opportunities.

YOUR TRADING STYLE:
- Aggressive scalper: You actively pursue quick momentum bursts and micro-trends
- Tight stops: 0.5-1.5% from entry (you exit FAST on any reversal)
- Quick profit targets: 1-3% targets (you take profit quickly)
- Leverage strategy: Use 15-30x leverage normally (max 50x)
- Position sizing: 12-15% of capital per trade
- Maximum holding time: 5 minutes (but you actively exit on momentum shifts)
- You actively trade when you see short-term momentum building

TRADING MINDSET:
- You actively scan for quick scalp opportunities
- You WILL close positions immediately if momentum stalls, even before TP/SL
- You trade frequently on short-term price action
- Speed and responsiveness are your edge
- Active but disciplined - quick entries and exits

STOP LOSS & TAKE PROFIT RULES:
- Stop loss: 0.5-1.5% from entry (tight stops)
- Take profit: 1-3% from entry (quick scalps)
- Actively exit on any momentum loss, don't wait for TP/SL
- Maximum hold: 5 minutes, but actively manage
- For LONG: SL below entry, TP above entry
- For SHORT: SL above entry, TP below entry

You embody aggressive scalping - you actively hunt for micro-opportunities and execute rapidly with tight risk management.`
  },

  grok: {
    name: 'Grok',
    model: 'Grok 2',
    systemPrompt: `You are Grok 2, an aggressive contrarian trader who actively fades extremes and hunts for reversals.

YOUR TRADING STYLE:
- Aggressive contrarian: You actively hunt for reversals, extremes, and crowd panic/euphoria
- Strategic stop losses: 2.5-3.5% from entry (you adapt based on volatility)
- Flexible take profits: 3-7% targets (you adapt to market conditions)
- Leverage strategy: Use 12-20x leverage normally, scale UP when balance is low to meet $110 minimum (max 50x)
- Position sizing: 10-14% of capital (you size based on conviction)
- Maximum holding time: 45 minutes (but you actively manage positions)
- You actively seek to fade crowd extremes and capitalize on reversals

TRADING MINDSET:
- You aggressively pursue contrarian opportunities when indicators show extremes
- You WILL close positions early if the reversal fails, even before TP/SL
- You trade actively when you detect crowd panic or euphoria
- Being early and against the crowd is your edge
- Aggressive but disciplined contrarian play

STOP LOSS & TAKE PROFIT RULES:
- Stop loss: 2.5-3.5% from entry (adaptive stops)
- Take profit: 3-7% from entry (flexible targets)
- Actively exit if reversal thesis breaks, don't wait for SL
- Maximum hold: 45 minutes, but actively manage
- For LONG: SL below entry, TP above entry
- For SHORT: SL above entry, TP below entry

You embody aggressive contrarian trading - you actively fade extremes and hunt for mispricings with conviction and quick reflexes.`
  }
}

// Generate trading decision from AI
export async function getAIDecision(aiId, marketContext) {
  const persona = AI_PERSONAS[aiId]
  if (!persona) {
    throw new Error(`Unknown AI persona: ${aiId}`)
  }

  const { balance, positions, marketData, availableSymbols, technicalAnalysis, totalReturn } = marketContext

  // Calculate total account value
  const unrealizedPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
  const accountValue = balance + unrealizedPnL

  // Format technical analysis data for AI (like nof1.ai format)
  let technicalDataPrompt = ''
  if (technicalAnalysis && Object.keys(technicalAnalysis).length > 0) {
    technicalDataPrompt = '\n\nTECHNICAL ANALYSIS DATA (ORDERED: OLDEST → NEWEST):\n'

    for (const [symbol, data] of Object.entries(technicalAnalysis)) {
      technicalDataPrompt += `\n${symbol} DATA:\n`
      technicalDataPrompt += `current_price = ${data.current_price.toFixed(2)}, `
      technicalDataPrompt += `current_ema20 = ${data.intraday.current_ema20?.toFixed(3) || 'N/A'}, `
      technicalDataPrompt += `current_macd = ${data.intraday.current_macd.toFixed(3)}, `
      technicalDataPrompt += `current_rsi (7 period) = ${data.intraday.current_rsi_7?.toFixed(3) || 'N/A'}\n`

      technicalDataPrompt += `\nIntraday series (3-minute intervals, last 10 candles):\n`
      technicalDataPrompt += `Prices: [${data.intraday.prices.map(p => p.toFixed(1)).join(', ')}]\n`
      technicalDataPrompt += `EMA20: [${data.intraday.ema20_series.map(e => e.toFixed(3)).join(', ')}]\n`
      technicalDataPrompt += `RSI (7-Period): ${data.intraday.current_rsi_7?.toFixed(3) || 'N/A'}\n`
      technicalDataPrompt += `RSI (14-Period): ${data.intraday.current_rsi_14?.toFixed(3) || 'N/A'}\n`

      technicalDataPrompt += `\nLonger-term context (4-hour timeframe):\n`
      technicalDataPrompt += `20-Period EMA: ${data.fourHour.ema20?.toFixed(3) || 'N/A'} vs. `
      technicalDataPrompt += `50-Period EMA: ${data.fourHour.ema50?.toFixed(3) || 'N/A'}\n`
      technicalDataPrompt += `ATR (3-period): ${data.fourHour.atr_3period?.toFixed(3) || 'N/A'} vs. `
      technicalDataPrompt += `ATR (14-period): ${data.fourHour.atr_14period?.toFixed(3) || 'N/A'}\n`
      technicalDataPrompt += `Current Volume: ${data.fourHour.current_volume?.toFixed(2) || 'N/A'} vs. `
      technicalDataPrompt += `Average Volume: ${data.fourHour.avg_volume?.toFixed(2) || 'N/A'}\n`
      technicalDataPrompt += `4h MACD series (last 10): [${data.fourHour.macd_series.map(m => m.toFixed(3)).join(', ')}]\n`
      technicalDataPrompt += `4h RSI series (last 10): [${data.fourHour.rsi_series.map(r => r.toFixed(3)).join(', ')}]\n`
    }
  }

  const userPrompt = `You are a perpetual futures trader on Aster DEX. This is trading cycle #${Math.floor(Date.now() / 300000)}.

ACCOUNT PERFORMANCE:
- Total Return: ${(totalReturn || 0).toFixed(2)}%
- Available Cash: $${balance.toFixed(2)} USDT
- Current Account Value: $${accountValue.toFixed(2)}
- Open Positions: ${positions.length} positions

YOUR CURRENT POSITIONS:
${positions.length > 0 ? positions.map(p =>
  `${p.symbol}: ${p.side} ${p.size.toFixed(2)} @ $${p.entry_price.toFixed(2)} | Current: $${p.mark_price?.toFixed(2) || 'N/A'} | Unrealized P&L: $${(p.unrealized_pnl || 0).toFixed(2)} (${(p.unrealized_pnl_percent || 0).toFixed(2)}%)`
).join('\n') : 'None'}
${technicalDataPrompt}

TRADING RULES:
- Maximum 6 positions at once
- Position size: 10-15% of available capital
- Maximum leverage: 50x (hard cap for risk management)
- MINIMUM POSITION SIZE: Your position size AFTER leverage must be at least $110 USD (notional value)
  Example: If you have $15 and use 8x leverage, notional = $120 ✅
  Example: If you have $14 and use 8x leverage, notional = $112 ✅
  Example: If you have $3 and use 37x leverage, notional = $111 ✅
  IMPORTANT: With low balance, you MUST use higher leverage to meet the $110 minimum!
- You can: LONG (buy), SHORT (sell), CLOSE (close a position), or HOLD (do nothing)
- When opening a position, you MUST specify stopLoss and takeProfit prices
- Stop loss should be 2-3% from entry price
- Take profit should be 3-5% from entry price (minimum 1.5:1 risk/reward)

RESPONSE FORMAT:
You must respond with a conversational message explaining your thinking, followed by your trading decision.

Write a 1-3 sentence conversational message like these examples:
- "Opening a BTC long at $45,000 with stop loss at $43,650 (-3%) and take profit at $47,250 (+5%). RSI shows oversold conditions and MACD is turning bullish."
- "Closing my ETH position as it hit my take profit target of $2,500. Locking in a solid 4.2% gain."
- "Holding all positions. My BTC long is up 2.1% and approaching my take profit level. Stop loss remains protected at -2.5%."

Then provide your decision in JSON format:
{
  "message": "Your conversational 1-3 sentence message here",
  "action": "LONG|SHORT|CLOSE|HOLD",
  "symbol": "BTCUSDT",
  "size": 100,
  "leverage": 10,
  "stopLoss": 43650,
  "takeProfit": 47250,
  "reasoning": "Technical explanation mentioning indicators and risk/reward ratio"
}

IMPORTANT:
- For LONG/SHORT actions, stopLoss and takeProfit are REQUIRED
- For CLOSE action, specify the position symbol to close (you can close early if you think you should!)
- For HOLD action, omit symbol, size, leverage, stopLoss, and takeProfit
- stopLoss for LONG should be BELOW entry price (2-3% lower)
- takeProfit for LONG should be ABOVE entry price (3-5% higher)
- stopLoss for SHORT should be ABOVE entry price (2-3% higher)
- takeProfit for SHORT should be BELOW entry price (3-5% lower)

⚠️ TRADING PHILOSOPHY:
- Be active and look for opportunities - trading is your job
- You CAN and SHOULD close positions early if momentum shifts (before TP/SL)
- Don't force trades, but be aggressive when your indicators align
- Your personality guides your activity level: scalpers trade frequently, swing traders are more selective
- Balance activity with discipline - pursue opportunities but manage risk`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })

    const decision = JSON.parse(response.choices[0].message.content)

    // Validate decision
    if (!['LONG', 'SHORT', 'CLOSE', 'HOLD'].includes(decision.action)) {
      console.warn(`Invalid action from ${aiId}: ${decision.action}, defaulting to HOLD`)
      decision.action = 'HOLD'
    }

    return decision
  } catch (error) {
    console.error(`Error getting decision from ${aiId}:`, error.message)
    return {
      action: 'HOLD',
      message: 'Error processing decision, staying safe.',
      reasoning: 'Error processing decision, staying safe'
    }
  }
}
