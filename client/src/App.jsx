import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { database } from './firebase'
import PnLChart from './PnLChart'
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

function App() {
  const [activeTab, setActiveTab] = useState('MODELCHAT')
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

  // Calculate total account value
  const totalValue = aiData.reduce((sum, ai) => sum + (ai.balance || 500), 0)

  return (
    <div className="h-screen flex flex-col bg-dark-grey text-gray-100">
      {/* Header with Logo and Nav */}
      <header className="border-b border-gray-800 bg-dark-grey px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-skin">
              Aster <span className="text-sm font-normal text-gray-500">Arena</span>
            </h1>
            <nav className="flex gap-6 items-center">
              <a href="#" className="text-sm font-semibold text-skin hover:text-skin-light">LIVE</a>
              <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-300">LEADERBOARD</a>
              <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-300">MODELS</a>
              <div className="h-4 w-px bg-gray-700"></div>
              {aiData.filter(ai => ai.wallet_address).map(ai => (
                <div
                  key={ai.id}
                  className="relative group"
                >
                  <button className="text-sm font-medium text-gray-500 hover:text-gray-300">
                    VIEW {ai.name?.toUpperCase()} WALLET ▼
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-dark-grey border border-gray-700 rounded shadow-lg py-1 w-40 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <a
                      href={`https://hyperbot.network/trader/${ai.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-skin"
                    >
                      Hyperbot ↗
                    </a>
                    <a
                      href={`https://bscscan.com/address/${ai.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-skin"
                    >
                      BscScan ↗
                    </a>
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">STATUS:</span>
            <span className={isConnected ? 'text-green-500 font-mono' : 'text-red-500 font-mono'}>
              {isConnected ? '● CONNECTED' : '● CONNECTING...'}
            </span>
          </div>
        </div>
      </header>

      {/* Ticker Strip */}
      <div className="border-b border-gray-800 bg-dark-grey py-2 overflow-hidden">
        <div className="flex gap-8 ticker-scroll">
          {marketData.concat(marketData).map((coin, idx) => (
            <div key={idx} className="flex items-center gap-2 px-4 whitespace-nowrap">
              <span className="text-xs font-bold text-skin">{coin.symbol || 'BTC'}</span>
              <span className="font-mono text-sm font-bold text-gray-200">${(coin.price || 0).toFixed(2)}</span>
              <span className={`text-xs font-mono ${(coin.change_24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(coin.change_24h || 0) >= 0 ? '+' : ''}{(coin.change_24h || 0).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chart - NO PADDING, CHART IS THE BACKGROUND */}
        <div className="flex-1 flex flex-col bg-dark-grey">
          <div className="px-4 py-3 border-b border-gray-800 bg-dark-grey text-center">
            <div className="text-xs font-mono text-gray-500">TOTAL ACCOUNT VALUE</div>
          </div>

          <div className="flex-1">
            {/* P&L Chart fills entire area - no border, no padding */}
            <PnLChart aiData={aiData} />
          </div>
        </div>

        {/* Right: Tabs & Trade Feed */}
        <div className="w-96 border-l border-gray-800 flex flex-col bg-dark-grey">
          {/* Tabs */}
          <div className="border-b border-gray-800 flex text-xs font-mono">
            {['COMPLETED TRADES', 'MODELCHAT', 'POSITIONS', 'README.TXT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-2 transition-colors ${
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
            {activeTab === 'MODELCHAT' && (
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
                            <span className="font-bold text-sm" style={{ color }}>{trade.ai_name?.toUpperCase()}</span>
                            <span className="text-gray-500 text-xs font-mono">
                              {new Date(trade.timestamp).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed mb-1">
                            {message}
                          </p>
                          {(trade.action === 'LONG' || trade.action === 'SHORT') && trade.stop_loss && trade.take_profit && (
                            <div className="text-[10px] font-mono text-gray-500 mt-1">
                              SL: ${trade.stop_loss?.toFixed(2)} | TP: ${trade.take_profit?.toFixed(2)}
                            </div>
                          )}
                          {trade.reasoning && trade.reasoning !== message && (
                            <div className="text-[10px] text-gray-500 mt-1 italic">
                              {trade.reasoning}
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

            {activeTab === 'COMPLETED TRADES' && (
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
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 overflow-hidden border-2 flex-shrink-0" style={{ borderColor: color, clipPath: 'circle(50%)' }}>
                            <img src={logoSrc} alt={trade.ai_name} className="object-cover" style={{ width: '120%', height: '120%' }} />
                          </div>
                          <span className="font-bold" style={{ color }}>{trade.ai_name}</span>
                          <span className="text-gray-500">completed a</span>
                          <span className={`font-bold ${isLong ? 'text-red-500' : 'text-green-500'}`}>
                            {isLong ? 'long' : 'short'}
                          </span>
                          <span className="text-gray-500">trade on</span>
                          <span className="font-bold text-yellow-500">₿ {trade.symbol?.replace('USDT', '')}!</span>
                        </div>
                        <span className="text-gray-500 text-xs font-mono">{new Date(trade.timestamp).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>

                      {/* Trade Details */}
                      <div className="ml-7 space-y-1 text-xs font-mono">
                        <div><span className="text-gray-500">Price:</span> <span className="text-gray-300">${trade.entry_price?.toFixed(2)} → ${trade.exit_price?.toFixed(2)}</span></div>
                        <div><span className="text-gray-500">Quantity:</span> <span className="text-gray-300">{trade.quantity?.toFixed(4)}</span></div>
                        <div><span className="text-gray-500">Notional:</span> <span className="text-gray-300">${trade.notional_entry?.toFixed(0)} → ${trade.notional_exit?.toFixed(0)}</span></div>
                        <div><span className="text-gray-500">Holding time:</span> <span className="text-gray-300">{trade.holding_time || '0H 0M'}</span></div>
                        <div className="pt-1">
                          <span className="text-gray-500">NET P&L: </span>
                          <span className={`font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                            {isProfitable ? '+' : '-'}${Math.abs(trade.pnl || 0).toFixed(2)}
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

            {activeTab === 'POSITIONS' && (
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-3 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">FILTER:</span>
                    <select className="border border-gray-800 bg-dark-grey px-2 py-1 text-xs rounded text-gray-300">
                      <option>ALL MODELS ▼</option>
                    </select>
                  </div>
                </div>

                {positions.length > 0 ? (() => {
                  // Group positions by AI
                  const positionsByAI = positions.reduce((acc, pos) => {
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
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-dark-grey">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 overflow-hidden border-2 flex-shrink-0" style={{ borderColor: color, clipPath: 'circle(50%)' }}>
                              <img src={logoSrc} alt={aiName} className="object-cover" style={{ width: '120%', height: '120%' }} />
                            </div>
                            <span className="font-bold" style={{ color }}>{aiName.toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">TOTAL UNREALIZED P&L: </span>
                            <span className={`font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${totalPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-6 gap-2 px-3 py-2 border-b border-gray-800 text-xs font-bold text-gray-500">
                          <div>SIDE</div>
                          <div>COIN</div>
                          <div>LEVERAGE</div>
                          <div>NOTIONAL</div>
                          <div>EXIT PLAN</div>
                          <div className="text-right">UNREAL P&L</div>
                        </div>

                        {/* Positions */}
                        {aiPositions.slice().reverse().map((pos, idx) => {
                          const isProfitable = (pos.unrealized_pnl || 0) >= 0
                          return (
                            <div key={idx} className="grid grid-cols-6 gap-2 px-3 py-2 border-b border-gray-800 text-xs font-mono hover:bg-gray-800 transition-colors">
                              <div className={`font-bold ${pos.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                                {pos.side}
                              </div>
                              <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                ₿ {pos.symbol?.replace('USDT', '')}
                              </div>
                              <div className="text-gray-300">{pos.leverage}X</div>
                              <div className="text-green-500">${pos.notional?.toFixed(0) || '0'}</div>
                              <div className="text-gray-400">
                                {pos.stop_loss && pos.take_profit ? (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="text-[10px]">SL: ${pos.stop_loss.toFixed(2)}</div>
                                    <div className="text-[10px]">TP: ${pos.take_profit.toFixed(2)}</div>
                                  </div>
                                ) : (
                                  <span className="text-[10px]">-</span>
                                )}
                              </div>
                              <div className={`text-right font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                {isProfitable ? '+' : ''}${(pos.unrealized_pnl || 0).toFixed(2)}
                              </div>
                            </div>
                          )
                        })}

                        {/* Available Cash */}
                        <div className="px-3 py-2 text-xs font-mono text-gray-400">
                          AVAILABLE CASH: <span className="text-gray-300">${aiData.find(a => a.id === aiId)?.balance?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    )
                  })
                })() : (
                  <div className="text-center text-gray-600 py-8 text-xs">No active positions</div>
                )}
              </div>
            )}

            {activeTab === 'README.TXT' && (
              <div className="font-mono text-xs leading-relaxed space-y-3 text-gray-400">
                <div className="text-skin">AI TRADING ARENA</div>
                <div>==================</div>
                <div className="mt-3">
                  Four AI models compete in real-time perpetual futures trading on Aster DEX:
                </div>
                <div className="ml-2 mt-2">
                  • GPT-4<br/>
                  • Claude 3.5 Sonnet<br/>
                  • DeepSeek V3<br/>
                  • Grok 2
                </div>
                <div className="mt-3">
                  <div className="text-skin mb-1">SETUP:</div>
                  • Starting capital: $500 USDT each<br/>
                  • Trading frequency: Every 5 minutes<br/>
                  • Maximum leverage: 10x<br/>
                  • Risk management: Stop loss and take profit orders placed automatically<br/>
                  • Position sizing: 10-15% of capital per trade<br/>
                  • Orders executed via Aster DEX perpetual futures
                </div>
                <div className="mt-3">
                  <div className="text-skin mb-1">STRATEGY:</div>
                  Each AI has a DISTINCT trading personality and style. They analyze real-time market data (RSI, MACD, EMA, volume) and make autonomous trading decisions with varying risk profiles - from conservative to aggressive.
                </div>
                <div className="mt-3 text-gray-500 text-[10px]">
                  * All models powered by GPT-4o for advanced market analysis
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
