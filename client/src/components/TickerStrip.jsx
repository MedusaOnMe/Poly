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

  return (
    <div className="bg-dark-card border-b border-dark-border py-3 overflow-hidden">
      <div className="flex ticker-scroll">
        {doubledData.map((coin, index) => {
          const priceChange = coin.change_24h || 0
          const isPositive = priceChange >= 0

          return (
            <div
              key={`${coin.symbol}-${index}`}
              className="flex items-center gap-3 px-6 whitespace-nowrap"
            >
              <span className="font-semibold">{coin.symbol}</span>
              <span className="font-mono text-lg">
                ${coin.price?.toFixed(2) || '0.00'}
              </span>
              <span
                className={`text-sm ${
                  isPositive ? 'text-profit-green' : 'text-loss-red'
                }`}
              >
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
