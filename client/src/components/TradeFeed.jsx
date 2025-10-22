export default function TradeFeed({ trades, showAll = false }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No trades yet</p>
      </div>
    )
  }

  const displayTrades = showAll ? trades : trades.slice(0, 10)

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {displayTrades.map((trade, index) => {
        const isLong = trade.side === 'LONG' || trade.action === 'LONG'
        const isClosed = trade.action === 'CLOSE'

        return (
          <div
            key={`${trade.ai_id}-${trade.timestamp}-${index}`}
            className="glass-card p-3 hover:bg-dark-bg/50 smooth-transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{trade.ai_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      isClosed
                        ? 'bg-gray-500/20 text-gray-400'
                        : isLong
                        ? 'bg-profit-green/20 text-profit-green'
                        : 'bg-loss-red/20 text-loss-red'
                    }`}
                  >
                    {trade.action}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {trade.symbol}
                  </span>
                </div>

                {trade.reasoning && (
                  <p className="text-xs text-gray-400 italic mt-1">
                    "{trade.reasoning}"
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {trade.size && (
                    <span>Size: {trade.size}</span>
                  )}
                  {trade.price && (
                    <span>Price: ${trade.price.toFixed(2)}</span>
                  )}
                  {trade.pnl !== undefined && (
                    <span
                      className={`font-semibold ${
                        trade.pnl >= 0 ? 'text-profit-green' : 'text-loss-red'
                      }`}
                    >
                      P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-gray-500">
                {formatTime(trade.timestamp)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
