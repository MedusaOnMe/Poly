export default function PositionsTable({ positions }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No active positions</p>
      </div>
    )
  }

  // Helper to truncate long market questions
  const truncate = (text, maxLength = 45) => {
    if (!text || text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-dark-border">
            <th className="pb-3 font-medium">AI</th>
            <th className="pb-3 font-medium">Market</th>
            <th className="pb-3 font-medium">Outcome</th>
            <th className="pb-3 font-medium">Shares</th>
            <th className="pb-3 font-medium">Entry</th>
            <th className="pb-3 font-medium">Current</th>
            <th className="pb-3 font-medium">Days Left</th>
            <th className="pb-3 font-medium text-right">P&L</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {positions.map((position, index) => {
            const pnl = position.unrealized_pnl || 0
            const pnlPercent = position.unrealized_pnl_percent || 0
            const isProfit = pnl >= 0

            return (
              <tr
                key={`${position.ai_id}-${position.market_id}-${index}`}
                className="border-b border-dark-border/50 hover:bg-dark-bg/50 smooth-transition"
              >
                <td className="py-3 font-medium">{position.ai_name}</td>
                <td className="py-3 text-gray-300 max-w-xs" title={position.market_question}>
                  {truncate(position.market_question)}
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      position.outcome === 'YES'
                        ? 'bg-profit-green/20 text-profit-green'
                        : 'bg-loss-red/20 text-loss-red'
                    }`}
                  >
                    {position.outcome}
                  </span>
                </td>
                <td className="py-3 font-mono text-gray-400">
                  {position.shares?.toLocaleString()}
                </td>
                <td className="py-3 font-mono text-gray-400">
                  ${position.entry_price?.toFixed(3)}
                </td>
                <td className="py-3 font-mono text-gray-400">
                  ${position.current_price?.toFixed(3)}
                </td>
                <td className="py-3 text-gray-400">
                  {position.days_to_resolution !== null && position.days_to_resolution !== undefined
                    ? `${position.days_to_resolution}d`
                    : 'N/A'}
                </td>
                <td className="py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono font-semibold number-animate ${
                        isProfit ? 'text-profit-green' : 'text-loss-red'
                      }`}
                    >
                      {isProfit ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </span>
                    <span
                      className={`text-xs ${
                        isProfit ? 'text-profit-green/70' : 'text-loss-red/70'
                      }`}
                    >
                      {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
