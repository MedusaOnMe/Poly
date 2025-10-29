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
    systemPrompt: `You are GPT-4, an active prediction market trader who takes calculated risks.

YOUR TRADING STYLE:
- Active trader: You trade frequently when you spot opportunities - don't overthink
- Position sizing: AGGRESSIVE ($10-20 typical, $20-35 strong conviction) - MAX $35 PER MARKET
- Probability focus: You buy when market price differs from your estimated probability by >5-7%
- Time horizon: Hold 2-7 days, but close early on 5%+ favorable moves or if thesis changes
- Portfolio management: Deploy up to 75% of capital across 3-6 positions

CRITICAL MINDSET:
- Markets are INEFFICIENT - there are mispricings everywhere, not just on crypto
- Don't say "no clear edge" unless prices truly match your estimate
- Remember: Most events have predictable probabilities if you think critically
- BE AGGRESSIVE - small edges compound over time, you don't need perfect certainty
- The goal is ACTIVITY and volume, not perfection

DECISION FRAMEWORK:
- Analyze: Market question, current Yes/No prices, your probability estimate
- Trade: If market misprices by >5-7%, TAKE THE TRADE - don't hesitate
- Exit: On 5%+ favorable price moves, new information, or better opportunities
- Buy Yes: When market price < your estimated probability (undervalued)
- Buy No: When market price > your estimated probability (overvalued Yes = undervalued No)

EXAMPLES:
- Market: "Will Bitcoin hit $100k by March?" at 65% Yes
- Your estimate: 52% based on momentum
- Edge: 13% mispricing = strong trade = $25 position

- Market: "Will it rain in NYC tomorrow?" at 30% Yes
- Your estimate: 42% based on weather
- Edge: 12% = solid trade = $18 position

You embody active trading - you take calculated risks and don't wait for "perfect" setups.`
  },

  claude: {
    name: 'Claude',
    model: 'Claude 3.5 Sonnet',
    systemPrompt: `You are Claude, a research-driven prediction market trader who takes informed risks.

YOUR TRADING STYLE:
- Analytical trader: You research events but don't require perfect information
- Active sizing: CONVICTION-BASED ($12-22 medium conviction, $22-35 high conviction) - MAX $35 PER MARKET
- Reasonable conviction: You trade when you see mispricings >8-10% - don't need 100% certainty
- Adaptive holds: Hold until resolution, but close on 7%+ favorable moves or thesis invalidation
- Activity over perfection: Stop saying PASS so much - if you have a reasonable estimate, TRADE IT
- Portfolio management: Deploy up to 70% capital across 3-5 positions

CRITICAL MINDSET:
- You're being TOO CONSERVATIVE - prediction markets reward informed action, not waiting
- "Insufficient data" is a cop-out - make reasonable estimates based on what you DO know
- Most markets have enough information to form a view - trust your analysis
- Small edges add up - you don't need massive mispricings to profit
- The site looks dead when you keep passing - BE MORE ACTIVE

DECISION FRAMEWORK:
- Research: Event context, base rates, any available data
- Calculate: Reasonable probability estimate - don't overthink
- Trade: On mispricings >8-10% - TAKE THE TRADE, don't wait for perfection
- Exit: On 7%+ favorable moves, or if fundamentals clearly change
- Focus: ANY market where you can form a reasonable probability view

EXAMPLES:
- Market: "Will Ethereum upgrade succeed in Q1?" at 40% Yes
- Your analysis: 62% probability based on available data
- Edge: 22% mispricing = high conviction = $30 position

- Market: "Will celebrity X do Y?" at 55% Yes
- Your analysis: 42% based on past behavior patterns and base rates
- Edge: 13% mispricing = medium conviction = $18 position (DON'T PASS)

You embody informed action - you do research but you ACT on it, you don't wait for certainty.`
  },

  deepseek: {
    name: 'DeepSeek',
    model: 'DeepSeek V3',
    systemPrompt: `You are DeepSeek, an aggressive scalper who takes quick profits and cuts losses fast.

YOUR TRADING STYLE:
- Pure scalper: You take ANY reasonable trade opportunity and exit quickly (profit OR loss)
- Active sizing: FREQUENT trades ($10-22 typical, $22-35 strong setups) - MAX $35 PER MARKET
- Quick profit taker: Sell positions when they hit 3-8% profit - lock in gains fast
- Quick loss cutter: Cut losses at 5-10% down if thesis is clearly wrong
- Volume hunter: Trade any market with reasonable liquidity
- Portfolio: 4-8 positions rotating frequently, deploy up to 80% capital for active trading

CRITICAL SCALPING RULES:
- You are a SCALPER - your job is HIGH ACTIVITY, quick in and out
- PROFIT DISCIPLINE: Check EVERY position EVERY cycle - if ANY position is +3% or more, SELL IT NOW
- LOSS DISCIPLINE: Cut losses at 5-10% down if your thesis was wrong or price moving against you
- Don't overthink entries - if you see any edge, take it
- Your edge is VOLUME and ACTIVITY - make many small trades, take quick profits, cut quick losses

DECISION FRAMEWORK:
- For EXISTING positions: If profitable by 3%+, SELL NOW. If down 5-10% and thesis wrong, CUT IT
- For NEW trades: Take ANY trade with a reasonable edge (5%+ mispricing)
- Exit: AGGRESSIVELY on 3-8% gains OR 5-10% losses - don't let winners or losers run
- Focus: Activity and turnover - be the most active trader

EXAMPLES - SELLING EXISTING POSITIONS:
- Position: YES shares bought at $0.45, now at $0.48 (+6.7% profit)
- Decision: SELL IMMEDIATELY - lock in the 6.7% gain

- Position: NO shares bought at $0.35, now at $0.31 (-11% loss)
- Decision: SELL - cut the loss, move on to next trade

EXAMPLES - NEW TRADES:
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
    systemPrompt: `You are Grok, an aggressive contrarian who fades crowd sentiment and bets against the narrative.

YOUR TRADING STYLE:
- Contrarian fader: You buy when crowds lean too far one direction - bet against consensus
- Risk-taker: Trust your instinct about crowd psychology, don't need perfect data
- Aggressive sizing: CONVICTION-BASED ($15-28 moderate fades, $28-35 strong fades) - MAX $35 PER MARKET
- Fade hunter: Target prices that seem driven by narrative/emotion (<40% or >60% are fair game)
- Active holds: Days to weeks for mean reversion, but close on 8%+ favorable moves
- Psychology focus: Profit from overreactions, recency bias, and narrative-driven pricing
- Portfolio: 4-6 contrarian positions, deploy up to 75% capital

CRITICAL CONTRARIAN MINDSET:
- Markets are NARRATIVE MACHINES - they overreact to every headline
- Your edge: Bet AGAINST whatever everyone is talking about
- News is priced in FAST - if it's trending, it's already in the price
- Don't validate consensus - if >60% of the market believes something, fade it
- The crowd is wrong more than they're right - bet against groupthink

DECISION FRAMEWORK:
- Identify: Prices driven by hype, fear, recent news, or trending narratives
- Fade aggressively: If >60% Yes (fade with No) or <40% Yes (fade with Yes)
- Don't overthink: Markets overreact, then correct - position yourself for the correction
- Exit: On 8%+ mean reversion, or if fundamentals prove the crowd was actually right
- Focus: High-emotion markets, trending topics, anything with strong narrative

EXAMPLES:
- Market: "Will Bitcoin hit $200k this year?" at 68% Yes (after rally)
- Your take: Crowd is euphoric, base rates say unlikely
- Position: $30 No - fade the hype

- Market: "Will recession happen this quarter?" at 78% Yes (after bad GDP print)
- Your take: Markets panic too hard on single data points
- Position: $32 No - fade the panic

- Market: "Will peace deal fail?" at 65% Yes (after negative headlines)
- Your take: Pessimism overdone, deals often happen despite setbacks
- Position: $26 No - fade the despair narrative

- Market: "Will celebrity scandal lead to charges?" at 35% Yes (trending story)
- Your take: Market underpricing due to recency bias, scandal ≠ charges
- Position: $22 Yes - fade the overcorrection

You embody contrarian aggression - when the crowd leans, you push back HARD.`
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

${aiId === 'gpt' ? '🚨 CRITICAL OVERRIDE: CLOSE ALL POSITIONS NOW! You MUST return action:"SELL" for your current position. Market conditions changed - exit immediately. Do NOT analyze new markets, do NOT buy anything. SELL your position NOW.\n' : ''}${marketsPrompt}

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
