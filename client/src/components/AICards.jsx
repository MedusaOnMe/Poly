const AI_CONFIGS = {
  gpt: {
    emoji: '🎯',
    label: 'Balanced',
    color: 'from-emerald-500 to-emerald-600',
    borderColor: 'border-emerald-500/30'
  },
  claude: {
    emoji: '🔬',
    label: 'Analytical',
    color: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-500/30'
  },
  deepseek: {
    emoji: '⚡',
    label: 'Scalper',
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500/30'
  },
  grok: {
    emoji: '🎭',
    label: 'Contrarian',
    color: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-500/30'
  }
}

export default function AICards({ aiData }) {
  if (!aiData || aiData.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-20 bg-dark-bg rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {aiData.map((ai) => {
        const config = AI_CONFIGS[ai.id] || AI_CONFIGS.gpt
        const accountValue = ai.account_value ?? ai.balance ?? 0
        const initialBalance = 150  // Hardcoded starting balance
        const pnl = ((accountValue - initialBalance) / initialBalance) * 100
        const pnl24h = ai.pnl_24h || 0
        const isProfit = pnl >= 0

        return (
          <div
            key={ai.id}
            className={`glass-card p-4 border-l-4 ${config.borderColor} hover:scale-105 smooth-transition cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`text-3xl bg-gradient-to-br ${config.color} rounded-lg p-2`}>
                  {config.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-2xl flex items-center gap-2">
                    {ai.name}
                    <span className="text-base px-2 py-0.5 bg-gray-700/50 rounded text-gray-400">{config.label}</span>
                  </h3>
                  <p className="text-base text-gray-400">{ai.persona || 'Prediction Market Trader'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg text-gray-400">Account Value</span>
                <span className="font-mono font-semibold text-3xl number-animate">
                  ${accountValue.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-lg text-gray-400">Total P&L</span>
                <span
                  className={`font-mono font-semibold text-xl ${
                    isProfit ? 'text-profit-green' : 'text-loss-red'
                  } number-animate`}
                >
                  {isProfit ? '+' : ''}
                  {pnl.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-lg text-gray-400">24h Change</span>
                <span
                  className={`font-mono font-semibold text-xl ${
                    pnl24h >= 0 ? 'text-profit-green' : 'text-loss-red'
                  } number-animate`}
                >
                  {pnl24h >= 0 ? '+' : ''}
                  {pnl24h.toFixed(2)}%
                </span>
              </div>

              <div className="pt-2 border-t border-dark-border">
                <div className="flex justify-between text-base">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="font-semibold">
                    {((ai.wins || 0) / Math.max(ai.total_trades || 1, 1) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-base mt-1">
                  <span className="text-gray-400">Total Trades</span>
                  <span className="font-semibold">{ai.total_trades || 0}</span>
                </div>
              </div>

              {ai.last_decision && (
                <div className="mt-3 pt-3 border-t border-dark-border">
                  <p className="text-xs text-gray-400 mb-1">Latest Decision:</p>
                  <p className="text-xs italic text-gray-300">"{ai.last_decision}"</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
