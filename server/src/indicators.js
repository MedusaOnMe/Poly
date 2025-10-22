import { MACD, RSI, EMA, ATR } from 'technicalindicators'

/**
 * Fetch historical klines (candlestick data) from Aster API
 * @param {AsterAPI} api - Aster API instance
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} interval - Timeframe ('3m', '1h', '4h', '1d')
 * @param {number} limit - Number of candles to fetch
 */
export async function getKlines(api, symbol, interval = '3m', limit = 100) {
  try {
    const klines = await api.getKlines(symbol, interval, limit)

    // Parse kline data into OHLCV format
    return klines.map(k => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }))
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error.message)
    return []
  }
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Default settings: fastPeriod=12, slowPeriod=26, signalPeriod=9
 */
export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod) return null

  try {
    const macdData = MACD.calculate({
      values: closes,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })

    // Return latest MACD value
    return macdData.length > 0 ? macdData[macdData.length - 1] : null
  } catch (error) {
    console.error('Error calculating MACD:', error.message)
    return null
  }
}

/**
 * Calculate RSI (Relative Strength Index)
 * Common periods: 7 (short-term), 14 (standard)
 */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period) return null

  try {
    const rsiData = RSI.calculate({
      values: closes,
      period
    })

    return rsiData.length > 0 ? rsiData[rsiData.length - 1] : null
  } catch (error) {
    console.error('Error calculating RSI:', error.message)
    return null
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
 * Common periods: 20, 50, 200
 */
export function calculateEMA(closes, period = 20) {
  if (closes.length < period) return null

  try {
    const emaData = EMA.calculate({
      values: closes,
      period
    })

    return emaData.length > 0 ? emaData[emaData.length - 1] : null
  } catch (error) {
    console.error('Error calculating EMA:', error.message)
    return null
  }
}

/**
 * Calculate ATR (Average True Range)
 * Used for volatility measurement
 */
export function calculateATR(klines, period = 14) {
  if (klines.length < period) return null

  try {
    const atrData = ATR.calculate({
      high: klines.map(k => k.high),
      low: klines.map(k => k.low),
      close: klines.map(k => k.close),
      period
    })

    return atrData.length > 0 ? atrData[atrData.length - 1] : null
  } catch (error) {
    console.error('Error calculating ATR:', error.message)
    return null
  }
}

/**
 * Get complete technical analysis for a symbol
 * Returns intraday (3m) and longer-term (4h) indicators like nof1.ai
 */
export async function getTechnicalAnalysis(api, symbol) {
  try {
    // Fetch 3-minute candles for intraday analysis (last 100 candles = 5 hours)
    const klines3m = await getKlines(api, symbol, '3m', 100)
    if (klines3m.length === 0) {
      return null
    }

    const closes3m = klines3m.map(k => k.close)
    const currentPrice = closes3m[closes3m.length - 1]

    // Intraday indicators (3-minute timeframe)
    const macd3m = calculateMACD(closes3m)
    const rsi7_3m = calculateRSI(closes3m, 7)
    const rsi14_3m = calculateRSI(closes3m, 14)
    const ema20_3m = calculateEMA(closes3m, 20)

    // Get recent price history (last 10 candles)
    const recentPrices = closes3m.slice(-10)
    const recentEMA20 = klines3m.slice(-10).map((_, i) =>
      calculateEMA(closes3m.slice(0, closes3m.length - 10 + i + 1), 20)
    ).filter(v => v !== null)

    // Fetch 4-hour candles for longer-term context (last 50 candles = 8 days)
    const klines4h = await getKlines(api, symbol, '4h', 50)
    const closes4h = klines4h.map(k => k.close)

    // Longer-term indicators (4-hour timeframe)
    const macd4h = calculateMACD(closes4h)
    const rsi14_4h = calculateRSI(closes4h, 14)
    const ema20_4h = calculateEMA(closes4h, 20)
    const ema50_4h = calculateEMA(closes4h, 50)
    const atr3_4h = calculateATR(klines4h.slice(-3), 3)
    const atr14_4h = calculateATR(klines4h, 14)

    // Get recent 4h MACD history (last 10 values)
    const recent4hMacd = klines4h.slice(-10).map((_, i) => {
      const subset = closes4h.slice(0, closes4h.length - 10 + i + 1)
      const macd = calculateMACD(subset)
      return macd ? macd.MACD : null
    }).filter(v => v !== null)

    // Get recent 4h RSI history (last 10 values)
    const recent4hRSI = klines4h.slice(-10).map((_, i) => {
      const subset = closes4h.slice(0, closes4h.length - 10 + i + 1)
      return calculateRSI(subset, 14)
    }).filter(v => v !== null)

    // Calculate average volume
    const avgVolume4h = klines4h.reduce((sum, k) => sum + k.volume, 0) / klines4h.length
    const currentVolume4h = klines4h[klines4h.length - 1]?.volume || 0

    return {
      symbol,
      current_price: currentPrice,

      // Intraday (3-minute) data
      intraday: {
        interval: '3m',
        current_ema20: ema20_3m,
        current_macd: macd3m?.MACD || 0,
        current_rsi_7: rsi7_3m,
        current_rsi_14: rsi14_3m,

        // Recent price series (last 10 candles)
        prices: recentPrices,
        ema20_series: recentEMA20,

        // MACD components
        macd_line: macd3m?.MACD || 0,
        macd_signal: macd3m?.signal || 0,
        macd_histogram: macd3m?.histogram || 0
      },

      // Longer-term (4-hour) context
      fourHour: {
        interval: '4h',
        ema20: ema20_4h,
        ema50: ema50_4h,
        atr_3period: atr3_4h,
        atr_14period: atr14_4h,
        current_volume: currentVolume4h,
        avg_volume: avgVolume4h,

        // Current indicators
        current_macd: macd4h?.MACD || 0,
        current_rsi_14: rsi14_4h,

        // Recent history (last 10 4h candles)
        macd_series: recent4hMacd,
        rsi_series: recent4hRSI
      }
    }
  } catch (error) {
    console.error(`Error in technical analysis for ${symbol}:`, error.message)
    return null
  }
}

/**
 * Get technical analysis for multiple symbols
 * Used to provide AI with comprehensive market data
 */
export async function getMultiSymbolAnalysis(api, symbols) {
  const analyses = {}

  // Process symbols sequentially to avoid rate limits
  for (const symbol of symbols) {
    const analysis = await getTechnicalAnalysis(api, symbol)
    if (analysis) {
      analyses[symbol] = analysis
    }

    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return analyses
}
