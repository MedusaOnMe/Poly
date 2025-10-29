export default function TickerStrip({ marketData }) {
  // Duplicate data for seamless loop
  const doubledData = [...marketData, ...marketData]

  if (!marketData || marketData.length === 0) {
    return (
      <div className="bg-dark-card border-b border-dark-border py-3">
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
          <div className="loading-bar">████████████</div>
          <span>Loading market data...</span>
        </div>
      </div>
    )
  }

  // Helper to truncate market questions for ticker
  const truncate = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <div className="bg-dark-card border-b border-dark-border py-3 overflow-hidden">
      <div className="flex ticker-scroll">
        {doubledData.map((market, index) => {
          const yesPrice = market.yes_price || 0
          const volume24h = market.volume_24h || 0

          // Color code YES price based on probability
          let priceColor = 'text-gray-100'
          if (yesPrice >= 0.7) {
            priceColor = 'text-green-400'
          } else if (yesPrice >= 0.5) {
            priceColor = 'text-emerald-300'
          } else if (yesPrice >= 0.3) {
            priceColor = 'text-yellow-400'
          } else {
            priceColor = 'text-red-400'
          }

          return (
            <div
              key={`${market.market_id}-${index}`}
              className="flex items-center gap-3 px-6 whitespace-nowrap"
            >
              <span className="text-white font-medium max-w-md" title={market.question}>
                {truncate(market.question, 40)}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className={`font-mono text-sm font-semibold ${priceColor}`}>
                YES ${(yesPrice || 0).toFixed(3)}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-xs text-white">
                Vol ${(volume24h / 1000).toFixed(0)}k
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
