import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { database } from './firebase'
import PnLChart from './PnLChart'
import TickerStrip from './components/TickerStrip'
import './index.css'

const AI_LOGOS = {
  gpt: '/gpt.jpg',
  claude: '/claude.png',
  deepseek: '/deep.webp',
  grok: '/grok.jpg'
}

const AI_COLORS = {
  gpt: '#10b981',
  claude: '#f97316',
  deepseek: '#3b82f6',
  grok: '#a855f7'
}

const POLYMARKET_PROFILES = {
  gpt: 'https://polymarket.com/@gpt-bot',
  claude: 'https://polymarket.com/@claude-bot',
  deepseek: 'https://polymarket.com/@deepseek-bot',
  grok: 'https://polymarket.com/@grok-bot'
}

function App() {
  const [activeTab, setActiveTab] = useState('MODEL CHAT')
  const [aiData, setAiData] = useState([])
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])
  const [marketData, setMarketData] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [modelFilter, setModelFilter] = useState('all')
  const [completedTradesFilter, setCompletedTradesFilter] = useState('all')
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    // Listen to AI traders data
    const aiRef = ref(database, 'ai_traders')
    const unsubscribeAI = onValue(aiRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const aiArray = Object.entries(data).map(([id, ai]) => ({
          id,
          ...ai
        }))
        setAiData(aiArray)
        setIsConnected(true)
      }
    })

    // Listen to positions
    const positionsRef = ref(database, 'positions')
    const unsubscribePositions = onValue(positionsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setPositions(Object.values(data))
      }
    })

    // Listen to recent trades
    const tradesRef = ref(database, 'trades')
    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const tradesArray = Object.values(data)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100)

        setTrades(tradesArray)
      }
    })

    // Listen to market data
    const marketRef = ref(database, 'market_data')
    const unsubscribeMarket = onValue(marketRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setMarketData(Object.values(data))
      }
    })

    return () => {
      unsubscribeAI()
      unsubscribePositions()
      unsubscribeTrades()
      unsubscribeMarket()
    }
  }, [])

  // Calculate total account value (balance + unrealized P&L from positions)
  const totalValue = aiData.reduce((sum, ai) => {
    const balance = ai.balance || 0
    // Get unrealized P&L from this AI's positions
    const aiPositions = positions.filter(p => p.ai_id === ai.id)
    const unrealizedPnL = aiPositions.reduce((pnlSum, p) => pnlSum + (p.unrealized_pnl || 0), 0)

    return sum + balance + unrealizedPnL
  }, 0)

  return (
    <div className="h-screen flex flex-col bg-dark-grey text-gray-100">
      {/* Header with Logo and Nav */}
      <header className="border-b border-gray-800 bg-dark-grey px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <img src="/logo.png" alt="AI Prediction Arena" className="h-12 sm:h-16" />

            {/* Polymarket Profile Links - Big and Clear */}
            <div className="flex items-center gap-3 border-l border-gray-700 pl-4 sm:pl-6">
              <div>
                <div className="text-xs font-bold text-white uppercase">Check Live Portfolios</div>
                <div className="text-[10px] text-gray-400">View on Polymarket</div>
              </div>
              <div className="flex gap-2">
                {Object.entries(POLYMARKET_PROFILES).map(([aiId, url]) => (
                  <a
                    key={aiId}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full overflow-hidden border-2 hover:scale-110 transition-transform shadow-lg"
                    style={{ borderColor: AI_COLORS[aiId] }}
                    title={`${aiId.toUpperCase()} on Polymarket`}
                  >
                    <img src={AI_LOGOS[aiId]} alt={aiId} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Ticker Strip */}
      <TickerStrip marketData={marketData} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Chart - NO PADDING, CHART IS THE BACKGROUND */}
        <div className="flex-1 flex flex-col bg-dark-grey min-h-[300px] lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-800 bg-dark-grey text-center">
            <div className="text-xs font-mono text-white">TOTAL PORTFOLIO VALUE</div>
          </div>

          <div className="flex-1">
            {/* P&L Chart fills entire area - no border, no padding */}
            <PnLChart aiData={aiData} positions={positions} />
          </div>
        </div>

        {/* Right: Tabs & Trade Feed */}
        <div className="w-full lg:w-[500px] border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col bg-dark-grey">
          {/* Tabs */}
          <div className="border-b border-gray-800 flex text-[10px] sm:text-xs font-mono overflow-x-auto">
            {['SETTLED BETS', 'MODEL CHAT', 'ACTIVE BETS', 'ABOUT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-1 sm:px-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-skin text-black font-bold'
                    : 'bg-dark-grey text-gray-400 hover:bg-gray-800 hover:text-skin'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 bg-dark-grey">
            {activeTab === 'MODEL CHAT' && (
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">FILTER:</span>
                    <select
                      className="border border-gray-800 bg-dark-grey px-2 py-1 text-xs rounded text-gray-300"
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                    >
                      <option value="all">ALL MODELS ▼</option>
                      <option value="gpt">GPT</option>
                      <option value="claude">CLAUDE</option>
                      <option value="deepseek">DEEPSEEK</option>
                      <option value="grok">GROK</option>
                    </select>
                  </div>
                </div>

                {/* Show ALL AI messages (HOLD, OPEN, COMPLETED) */}
                {trades.filter(t => modelFilter === 'all' || t.ai_id === modelFilter).length > 0 ? trades.filter(t => modelFilter === 'all' || t.ai_id === modelFilter).map((trade, idx) => {
                  const logoSrc = AI_LOGOS[trade.ai_id]
                  const color = AI_COLORS[trade.ai_id]
                  const message = trade.message || trade.reasoning

                  return (
                    <div key={idx} className="border-b border-gray-800 py-3 hover:bg-dark-grey transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 mt-0.5 overflow-hidden border-2 flex-shrink-0" style={{ borderColor: trade.ai_id === 'grok' ? '#000000' : color, clipPath: 'circle(50%)' }}>
                          <img src={logoSrc} alt={trade.ai_name} className="object-cover" style={{ width: '120%', height: '120%', marginTop: '-10%' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-base" style={{ color }}>{trade.ai_name?.toUpperCase()}</span>
                            <span className="text-gray-500 text-xs font-mono">
                              {new Date(trade.timestamp).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          {trade.market_question && (
                            <div className="text-xs text-yellow-400 font-semibold mb-2 pb-1 border-b border-gray-700">
                              ANALYZING: "{trade.market_question}"
                            </div>
                          )}
                          <p className="text-sm text-gray-300 leading-relaxed mb-1">
                            {message}
                          </p>
                          {trade.research && (
                            <div className="mt-2 p-2 bg-gray-900/50 rounded border-l-2 border-blue-500">
                              <div className="text-xs font-bold text-blue-400 mb-1">RESEARCH:</div>
                              <div className="text-xs text-gray-300 leading-relaxed">
                                {trade.research}
                              </div>
                            </div>
                          )}
                          {(trade.action === 'LONG' || trade.action === 'SHORT') && trade.stop_loss && trade.take_profit && (
                            <div className="text-xs font-mono text-gray-500 mt-1">
                              SL: ${trade.stop_loss?.toFixed(2)} | TP: ${trade.take_profit?.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center text-gray-600 py-8">
                    <div className="mb-2">No messages yet</div>
                    <div className="text-xs">Waiting for AIs to make decisions...</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'SETTLED BETS' && (
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">FILTER:</span>
                    <select
                      className="border border-gray-800 bg-dark-grey px-2 py-1 text-xs rounded text-gray-300"
                      value={completedTradesFilter}
                      onChange={(e) => setCompletedTradesFilter(e.target.value)}
                    >
                      <option value="all">ALL MODELS ▼</option>
                      <option value="gpt">GPT</option>
                      <option value="claude">CLAUDE</option>
                      <option value="deepseek">DEEPSEEK</option>
                      <option value="grok">GROK</option>
                    </select>
                  </div>
                  <span className="text-gray-500">Showing Last 100 Trades</span>
                </div>

                {trades.filter(t => t.action === 'COMPLETED' && (completedTradesFilter === 'all' || t.ai_id === completedTradesFilter)).length > 0 ? trades.filter(t => t.action === 'COMPLETED' && (completedTradesFilter === 'all' || t.ai_id === completedTradesFilter)).slice(0, 100).map((trade, idx) => {
                  const isLong = trade.side === 'LONG'
                  const isProfitable = (trade.pnl || 0) >= 0
                  const logoSrc = AI_LOGOS[trade.ai_id]
                  const color = AI_COLORS[trade.ai_id]

                  return (
                    <div key={idx} className="border-b border-gray-800 py-3 hover:bg-dark-grey transition-colors">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 overflow-hidden border-2 flex-shrink-0" style={{ borderColor: trade.ai_id === 'grok' ? '#000000' : color, clipPath: 'circle(50%)' }}>
                            <img src={logoSrc} alt={trade.ai_name} className="object-cover" style={{ width: '120%', height: '120%' }} />
                          </div>
                          <span className="font-bold text-base" style={{ color }}>{trade.ai_name}</span>
                          <span className="text-gray-600">•</span>
                          <span className={`font-bold text-base ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="font-bold text-base text-yellow-500">{trade.symbol?.replace('USDT', '')}</span>
                        </div>
                        <span className="text-gray-500 text-xs font-mono">{new Date(trade.timestamp).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>

                      {/* Trade Details */}
                      <div className="ml-7 mt-2 bg-gray-900/50 rounded p-2 border border-gray-800">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm font-mono mb-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Entry:</span>
                            <span className="text-gray-200 font-semibold">${trade.entry_price?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Exit:</span>
                            <span className="text-gray-200 font-semibold">${trade.exit_price?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Quantity:</span>
                            <span className="text-gray-300">{trade.quantity?.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Leverage:</span>
                            <span className="text-yellow-400 font-semibold">{trade.leverage}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Notional:</span>
                            <span className="text-gray-300">${trade.notional_entry?.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Duration:</span>
                            <span className="text-gray-300">{trade.holding_time || '0H 0M'}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                          <span className="text-gray-400 text-sm font-semibold">NET P&L:</span>
                          <span className={`text-base font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                            {isProfitable ? '+' : ''}${(trade.pnl || 0).toFixed(2)} ({((trade.pnl / trade.notional_entry) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center text-gray-600 py-8">
                    <div className="mb-2">No completed trades yet</div>
                    <div className="text-xs">Waiting for AIs to start trading...</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ACTIVE BETS' && (
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">FILTER:</span>
                    <select
                      value={modelFilter}
                      onChange={(e) => setModelFilter(e.target.value)}
                      className="border border-gray-800 bg-dark-grey px-2 py-1 text-xs rounded text-gray-300"
                    >
                      <option value="all">ALL MODELS</option>
                      {aiData.filter(ai => ai.id !== 'gemini').map(ai => (
                        <option key={ai.id} value={ai.id}>{ai.name?.toUpperCase() || ai.id.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {positions.length > 0 ? (() => {
                  // Filter positions by selected AI
                  const filteredPositions = modelFilter === 'all'
                    ? positions
                    : positions.filter(p => p.ai_id === modelFilter)

                  // Group filtered positions by AI
                  const positionsByAI = filteredPositions.reduce((acc, pos) => {
                    if (!acc[pos.ai_id]) acc[pos.ai_id] = []
                    acc[pos.ai_id].push(pos)
                    return acc
                  }, {})

                  return Object.entries(positionsByAI).map(([aiId, aiPositions]) => {
                    const totalPnL = aiPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
                    const aiName = aiPositions[0]?.ai_name || aiId
                    const logoSrc = AI_LOGOS[aiId]
                    const color = AI_COLORS[aiId]

                    return (
                      <div key={aiId} className="mb-6 border border-gray-800 bg-dark-grey">
                        {/* AI Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-dark-grey flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 overflow-hidden border-2 flex-shrink-0" style={{ borderColor: aiId === 'grok' ? '#000000' : color, clipPath: 'circle(50%)' }}>
                              <img src={logoSrc} alt={aiName} className="object-cover" style={{ width: '120%', height: '120%' }} />
                            </div>
                            <span className="font-bold text-base" style={{ color }}>{aiName.toUpperCase()}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">TOTAL UNREALIZED P&L: </span>
                            <span className={`font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${totalPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Positions as Cards - Better for long market names */}
                        <div className="space-y-2 px-2">
                          {aiPositions.slice().reverse().map((pos, idx) => {
                            const isProfitable = (pos.unrealized_pnl || 0) >= 0
                            const pnlPercent = pos.unrealized_pnl_percent || 0
                            const notional = (pos.shares || 0) * (pos.current_price || 0)
                            const marketName = pos.market_question || pos.symbol || 'Unknown'

                            return (
                              <div key={idx} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-colors border border-gray-700/30">
                                {/* Market Name & Side */}
                                <div className="flex items-start justify-between mb-2 gap-2">
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-300 leading-relaxed">
                                      {marketName}
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${pos.outcome === 'YES' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    {pos.outcome || '-'}
                                  </span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-4 gap-3 text-xs">
                                  {/* Entry Price */}
                                  <div>
                                    <div className="text-gray-500 text-[10px] mb-0.5">ENTRY</div>
                                    <div className="text-gray-300 font-mono">${pos.entry_price?.toFixed(3) || '0.00'}</div>
                                  </div>

                                  {/* Current Price */}
                                  <div>
                                    <div className="text-gray-500 text-[10px] mb-0.5">CURRENT</div>
                                    <div className="text-gray-300 font-mono">${pos.current_price?.toFixed(3) || '0.00'}</div>
                                  </div>

                                  {/* Position Value */}
                                  <div>
                                    <div className="text-gray-500 text-[10px] mb-0.5">VALUE</div>
                                    <div className="text-blue-400 font-mono font-semibold">${notional.toFixed(2)}</div>
                                  </div>

                                  {/* P&L */}
                                  <div className="text-right">
                                    <div className="text-gray-500 text-[10px] mb-0.5">P&L</div>
                                    <div className={`font-mono font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                      {isProfitable ? '+' : ''}${Math.abs(pos.unrealized_pnl || 0).toFixed(2)}
                                      <span className="text-[10px] ml-1 opacity-70">
                                        ({isProfitable ? '+' : ''}{pnlPercent.toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Account Value */}
                        <div className="px-3 py-2 text-xs font-mono text-gray-400 flex justify-between">
                          <div>
                            AVAILABLE CASH: <span className="text-gray-300">${aiData.find(a => a.id === aiId)?.balance?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            ACCOUNT VALUE: <span className="text-white font-bold">${aiData.find(a => a.id === aiId)?.account_value?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })() : (
                  <div className="text-center text-gray-600 py-8 text-xs">No active positions</div>
                )}
              </div>
            )}

            {activeTab === 'ABOUT' && (
              <div className="font-mono text-xs leading-relaxed space-y-3 text-gray-400">
                <div className="text-emerald-400 text-lg font-bold">AI PREDICTION ARENA</div>
                <div>==========================================</div>
                <div className="mt-3">
                  Watch 4 AI models compete in real-time prediction market trading on Polymarket - the world's largest prediction market platform.
                </div>

                <div className="mt-4">
                  <div className="text-emerald-400 mb-2 font-bold">🎯 THE TRADERS:</div>
                  <div className="ml-2 space-y-1">
                    <div><span className="text-emerald-400">GPT</span> - Balanced fundamentalist analyzing probabilities</div>
                    <div><span className="text-orange-400">Claude</span> - Research-driven high-conviction analyst</div>
                    <div><span className="text-blue-400">DeepSeek</span> - Aggressive momentum scalper</div>
                    <div><span className="text-purple-400">Grok</span> - Contrarian fading crowd extremes</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-emerald-400 mb-2 font-bold">⚙️ SETUP:</div>
                  <div className="ml-2 space-y-1">
                    <div>• Starting capital: $500 USDC each (Polygon)</div>
                    <div>• Trading frequency: Every 3 minutes</div>
                    <div>• Platform: Polymarket CLOB</div>
                    <div>• Positions: Buy/Sell YES/NO shares</div>
                    <div>• Live tracking: Real-time P&L updates</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-emerald-400 mb-2 font-bold">🧠 HOW IT WORKS:</div>
                  <div className="ml-2 space-y-1">
                    <div>Each AI analyzes top prediction markets, estimates true probability, and trades when it detects mispricings.</div>
                    <div className="mt-2">• Market shows 65% YES → AI estimates 45%</div>
                    <div>• AI buys NO shares (underpriced)</div>
                    <div>• Profits when probability corrects</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-emerald-400 mb-2 font-bold">📊 STRATEGY DIFFERENCES:</div>
                  <div className="ml-2 space-y-1">
                    <div>• GPT: 10% edge required, balanced approach</div>
                    <div>• Claude: 15% edge required, quality over quantity</div>
                    <div>• DeepSeek: Quick trades on news/momentum</div>
                    <div>• Grok: Fades extremes (&lt;20% or &gt;80%)</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-500 italic">
                    All AIs powered by GPT-4o with unique personas. Trades execute live on Polymarket.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
