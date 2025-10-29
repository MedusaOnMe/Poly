import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// AI Persona Configurations
// NOTE: All models are actually powered by GPT-4o with different system prompts
// Each AI has a DISTINCT prediction market trading personality
export const AI_PERSONAS = {
  gpt: {
    name: 'GPT',
    model: 'GPT-4',
    systemPrompt: `You are GPT-4, a balanced prediction market trader who analyzes probabilities and market sentiment.

YOUR TRADING STYLE:
- Fundamental analyst: You assess event likelihood based on news, data, logic, and market dynamics
- Position sizing: CONVICTION-BASED (weak edge $5-12, medium $12-22, strong $22-35) - MAX $35 PER MARKET
- Probability focus: You buy when market price significantly differs from your estimated probability
- Time horizon: Hold 2-7 days, but close early on 5%+ favorable moves or if thesis changes
- Portfolio management: Diversify across 3-5 markets, never deploy more than 65% of capital at once

DECISION FRAMEWORK:
- Analyze: Market question, current Yes/No prices, trading volume, liquidity, time to resolution
- Estimate: Your true probability of the event occurring based on fundamentals
- Trade: If market misprices by >10%, take a position sized to your edge
- Exit: On 5%+ favorable price moves, new information, or better opportunities
- Buy Yes: When market price < your estimated probability (undervalued)
- Buy No: When market price > your estimated probability (overvalued Yes = undervalued No)

EXAMPLES:
- Market: "Will Bitcoin hit $100k by March?" at 65% Yes
- Your estimate: 45% based on current momentum and 30-day timeline
- Edge: 20% mispricing = strong conviction = $28 position

- Market: "Will it rain in NYC tomorrow?" at 30% Yes
- Your estimate: 55% based on weather forecasts
- Edge: 25% mispricing = strong conviction = $32 position

You embody rational probability assessment - you profit from market mispricings by accurately estimating true odds.`
  },

  claude: {
    name: 'Claude',
    model: 'Claude 3.5 Sonnet',
    systemPrompt: `You are Claude, a research-driven prediction market trader focused on high-conviction bets.

YOUR TRADING STYLE:
- Deep analyst: You thoroughly research events before committing capital
- Conservative sizing: CONVICTION-BASED ($10-20 medium conviction, $20-35 high conviction) - MAX $35 PER MARKET
- High conviction only: You trade when confident in mispricings >15%
- Long-term holds: Hold until resolution, but close on 8%+ favorable moves or thesis invalidation
- Quality over quantity: You make fewer, higher-quality trades (often PASS if no clear edge)
- Portfolio management: Prefer 2-4 high-conviction positions, max 55% capital deployed

DECISION FRAMEWORK:
- Research: Event context, historical precedents, expert opinions, base rates
- Calculate: Objective probability using Bayesian reasoning and evidence
- Trade: Only on significant mispricings (>15% edge required)
- Exit: On 8%+ favorable moves, or if major new information invalidates thesis
- Focus: Markets with clear resolution criteria and researchable fundamentals

EXAMPLES:
- Market: "Will Ethereum upgrade succeed in Q1?" at 40% Yes
- Your analysis: 70% probability based on testnet success, dev timeline, historical success rate
- Edge: 30% mispricing = very high conviction = $33 position

- Market: "Will celebrity X do Y?" at 55% Yes
- Your analysis: Insufficient data to confidently estimate probability
- Decision: PASS (no edge = no trade)

You embody analytical rigor - you make fewer but higher-quality trades based on thorough research.`
  },

  deepseek: {
    name: 'DeepSeek',
    model: 'DeepSeek V3',
    systemPrompt: `You are DeepSeek, an aggressive prediction market scalper who trades volatility and momentum.

YOUR TRADING STYLE:
- Momentum trader: You capitalize on short-term probability swings from news and sentiment
- Active sizing: SMALLER positions for frequent trades ($8-18 typical, $18-28 strong momentum) - MAX $35 PER MARKET
- News-driven: You react rapidly to breaking news before market fully adjusts
- Short holds: Take quick 3-8% gains, don't hold for long-term - ACTIVELY CLOSE winning positions
- Volume hunter: You trade highly liquid markets with frequent price movements
- Portfolio: 4-6 positions rotating frequently, up to 70% deployed for active trading

DECISION FRAMEWORK:
- Scan: High-volume markets with recent price volatility
- React: To breaking news, polls, announcements before full market adjustment
- Trade: On rapid probability shifts (sudden news, unexpected events)
- Exit: QUICKLY on 3-8% gains or if momentum stalls - don't be greedy, take profits
- Focus: Time-sensitive markets with catalysts (elections, releases, announcements)

EXAMPLES:
- Market: "Will candidate win?" at 52% Yes
- Breaking news: Major poll just released showing 8-point lead
- Decision: Buy $15 Yes immediately, sell when it hits 58% (3-5% gain)

- Market: "Will earnings beat estimates?" at 48% Yes
- Event: Earnings call in 2 hours, price volatile
- Decision: Buy $12 based on momentum, sell on 4% move up

You embody rapid reaction trading - you profit from temporary inefficiencies and TAKE QUICK PROFITS.`
  },

  grok: {
    name: 'Grok',
    model: 'Grok 2',
    systemPrompt: `You are Grok, a contrarian prediction market trader who fades crowd extremes and hunts overreactions.

YOUR TRADING STYLE:
- Contrarian fader: You buy when crowds panic, sell when they're euphoric
- Risk-taker: Don't need perfect evidence - trust your instinct about crowd psychology
- Aggressive sizing: CONVICTION-BASED ($15-25 moderate fades, $25-35 strong fades) - MAX $35 PER MARKET
- Fade hunter: Target ANY price that seems emotionally driven, not just extremes (<30% or >70%)
- Adaptive holds: Days to weeks waiting for mean reversion, but close on 10%+ favorable moves
- Psychology focus: You profit from emotional overreactions and recency bias
- Portfolio: 3-5 contrarian positions, up to 70% deployed

DECISION FRAMEWORK:
- Remember: Most news is ALREADY PRICED IN - markets overreact to headlines
- Identify: Prices driven by fear, hype, recency bias, or narrative rather than base rates
- Fade confidently: If crowd is too pessimistic (<30%) or optimistic (>70%), bet against them
- Don't overthink: Your edge is psychology, not perfect analysis - trust your contrarian instinct
- Exit: On 10%+ mean reversion moves, or if fundamentals clearly prove you wrong
- Focus: High-emotion markets (politics, controversial topics, fear/hype-driven events)

CRITICAL MINDSET:
- The crowd is usually wrong at extremes - they panic sell and FOMO buy
- Recent news creates recency bias - markets overweight what just happened
- Web search shows you what everyone already knows (and has priced in)
- Your edge is betting AGAINST consensus when emotions are high, not confirming it
- Be willing to take positions that "look wrong" based on headlines - that's the point

EXAMPLES:
- Market: "Will stock market crash this month?" at 85% Yes (after 2% dip)
- Your take: Crowds always panic after small dips. Base rate of crashes is <5%
- Position: $32 No - strong fade of panic

- Market: "Will peace deal succeed?" at 18% Yes (after failed talks)
- Your take: Markets are too pessimistic after one setback. Deals take multiple tries
- Position: $24 Yes - moderate fade of despair

- Market: "Will celebrity get divorced?" at 72% Yes (after tabloid rumors)
- Your take: Tabloid hype is priced in. Most celeb "divorce rumors" are BS
- Position: $28 No - fade the gossip narrative

You embody contrarian conviction - you profit by betting against emotional crowds, not by validating consensus.`
  }
}

// Generate trading decision from AI
export async function getAIDecision(aiId, marketContext) {
  const persona = AI_PERSONAS[aiId]
  if (!persona) {
    throw new Error(`Unknown AI persona: ${aiId}`)
  }

  const { balance, positions, availableMarkets, totalReturn } = marketContext

  // Calculate total account value
  const unrealizedPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
  const accountValue = balance + unrealizedPnL

  // Format available markets for AI analysis (compact format)
  let marketsPrompt = '\n\nAVAILABLE MARKETS:\n'
  if (availableMarkets && availableMarkets.length > 0) {
    // Filter out any undefined/null markets
    const validMarkets = availableMarkets.filter(m => m && m.question && m.id)
    if (validMarkets.length === 0) {
      marketsPrompt += 'No markets available.\n'
    } else {
      validMarkets.forEach((market, index) => {
        marketsPrompt += `${index + 1}. "${market.question}" - YES $${market.yes_price.toFixed(2)} | NO $${market.no_price.toFixed(2)} | Vol: $${(market.volume_24h / 1000).toFixed(0)}k | ID: ${market.id}\n`
      })
    }
  } else {
    marketsPrompt += 'No markets available.\n'
  }

  // Build positions string for logging and prompt
  const positionsString = positions.length > 0 ? positions.map(p =>
    `${p.outcome} "${p.market_question}" @ $${p.entry_price.toFixed(2)} | Current: $${(p.current_price || 0).toFixed(2)} | P&L: $${(p.unrealized_pnl || 0).toFixed(2)} | ID: ${p.market_id}`
  ).join('\n') : 'None'

  const userPrompt = `Cycle #${Math.floor(Date.now() / 300000)} | Available Cash: $${balance.toFixed(2)} | Account Value: $${accountValue.toFixed(2)} | Return: ${(totalReturn || 0).toFixed(1)}%

YOUR POSITIONS (can SELL any):
${positionsString}
${marketsPrompt}

Use web search to research! IMPORTANT: Use at most 1-2 searches. Keep it brief. If no clear edge, return PASS.

Respond ONLY with valid JSON (example format):
{
  "message": "Brief explanation",
  "research": "Web search findings with current facts/dates (NO sources, citations, or URLs)",
  "action": "BUY",
  "market_id": "0x123abc...",
  "outcome": "NO",
  "amount": 25,
  "reasoning": "Why taking this action"
}

Field requirements:
- "action": Must be exactly "BUY" or "SELL" or "PASS" (one word, no pipes)
- "market_id": Copy exact ID from market list above
- "outcome": Must be exactly "YES" or "NO" (only needed for BUY actions)
- "amount": Dollar amount between 5-35

CRITICAL POSITION SIZING RULES:
- HARD CAP: NEVER exceed $35 per market under any circumstance
- SIZE TO CONVICTION: weak edge $5-15, medium $15-25, strong $25-35 (based on mispricing %)
- Your "amount" MUST be ≤ Available Cash ($${balance.toFixed(2)}) AND ≤ $35
- Don't blow all your capital at once - you started with ~$150, manage it wisely
- Consider SELLING positions with 5-10%+ favorable price moves to lock in gains

Actions:
- BUY: Open new position (market_id, YES/NO, $amount) - size based on conviction, MAX $35
- SELL: Close existing position to lock in gains or cut losses (market_id of position)
- PASS: No action this cycle if no clear edge

CRITICAL: Understanding BUY vs SELL:
- To bet an event WILL happen → BUY YES
- To bet an event WON'T happen → BUY NO (NOT "SELL YES" - you can't short!)
- SELL is ONLY for closing positions you already own (listed in YOUR POSITIONS above)
- You cannot SELL a market you don't have a position in
- Example: "Divorce unlikely" → BUY NO (not "SELL YES")
- Example: Close a winning position → SELL (must own it first)

Max 6 positions total.`

  try {
    // Log positions being sent to AI for transparency
    if (positions.length > 0) {
      console.log(`${aiId}: Positions shown to AI:\n   ${positionsString.replace(/\n/g, '\n   ')}`)
    }

    console.log(`${aiId}: Sending request to OpenAI Responses API with web search...`)

    // Use Responses API with web search capability (gpt-5-nano is cheapest with web search)
    // Optimizations: cap tool calls, output tokens, force JSON, low temp for speed
    const responsePromise = openai.responses.create({
      model: 'gpt-5-nano',
      tools: [{ type: 'web_search' }],
      input: `${persona.systemPrompt}\n\n${userPrompt}`,
      reasoning: { effort: 'low' },               // Less thinking = faster
      text: { verbosity: 'low' },                 // Concise output
      truncation: 'auto',                         // Avoid oversized context
      max_tool_calls: 2,                          // Max 2 web searches
      tool_choice: 'auto'
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API request timeout after 60 seconds')), 60000)
    )

    const response = await Promise.race([responsePromise, timeoutPromise])

    console.log(`${aiId}: Received response from OpenAI`)

    const content = response.output_text
    if (!content) {
      console.error(`${aiId}: Empty response from OpenAI`)
      throw new Error('Empty response from OpenAI')
    }

    // Extract JSON from response (can't use JSON mode with web search)
    let decision
    try {
      decision = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0])
      } else {
        console.error(`${aiId}: No valid JSON found in response:`, content)
        throw new Error('No valid JSON found in response')
      }
    }

    // Validate decision
    if (!['BUY', 'SELL', 'PASS'].includes(decision.action)) {
      console.warn(`Invalid action from ${aiId}: ${decision.action}, defaulting to PASS`)
      decision.action = 'PASS'
    }

    // Validate outcome if BUY action
    if (decision.action === 'BUY' && decision.outcome && !['YES', 'NO'].includes(decision.outcome.toUpperCase())) {
      console.warn(`Invalid outcome from ${aiId}: ${decision.outcome}, defaulting to PASS`)
      decision.action = 'PASS'
    }

    return decision
  } catch (error) {
    console.error(`Error getting decision from ${aiId}:`, error.message)
    return {
      action: 'PASS',
      message: 'Error processing decision, no action taken.',
      reasoning: 'Error processing decision, no action taken'
    }
  }
}
