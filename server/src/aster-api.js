import axios from 'axios'
import crypto from 'crypto'

const BASE_URL = 'https://fapi.asterdex.com'

export class AsterAPI {
  constructor(apiKey, secretKey) {
    this.apiKey = apiKey
    this.secretKey = secretKey
  }

  // Generate HMAC SHA256 signature
  _generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex')
  }

  // Make signed request
  async _signedRequest(method, endpoint, params = {}) {
    const timestamp = Date.now()
    params.timestamp = timestamp

    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    const signature = this._generateSignature(queryString)
    const fullQueryString = `${queryString}&signature=${signature}`

    const config = {
      method,
      url: `${BASE_URL}${endpoint}?${fullQueryString}`,
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    }

    try {
      const response = await axios(config)
      return response.data
    } catch (error) {
      console.error(`Aster API Error (${endpoint}):`, error.response?.data || error.message)
      throw error
    }
  }

  // Get account balance
  async getBalance() {
    return await this._signedRequest('GET', '/fapi/v2/balance')
  }

  // Get account info
  async getAccount() {
    return await this._signedRequest('GET', '/fapi/v4/account')
  }

  // Get account info v3 (includes more details like wallet address)
  async getAccountV3() {
    return await this._signedRequest('GET', '/fapi/v3/account')
  }

  // Get spot account balance (for BNB and other spot holdings)
  async getSpotBalance() {
    return await this._signedRequest('GET', '/api/v3/account')
  }

  // Set position mode to hedge (allows LONG and SHORT positions simultaneously)
  async setPositionModeHedge() {
    return await this._signedRequest('POST', '/fapi/v1/positionSide/dual', { dualSidePosition: true })
  }

  // Get current positions
  async getPositions(symbol = null) {
    const params = symbol ? { symbol } : {}
    return await this._signedRequest('GET', '/fapi/v2/positionRisk', params)
  }

  // Place new order
  async placeOrder(params) {
    // Required: symbol, side, type, quantity
    // Optional: price, timeInForce, stopPrice, etc.
    return await this._signedRequest('POST', '/fapi/v1/order', params)
  }

  // Close position (market order opposite side)
  async closePosition(symbol, side, quantity) {
    const closeSide = side === 'LONG' ? 'SELL' : 'BUY'
    return await this.placeOrder({
      symbol,
      side: closeSide,
      type: 'MARKET',
      quantity,
      positionSide: side
    })
  }

  // Place stop loss order (STOP_MARKET)
  async placeStopLoss(symbol, side, quantity, stopPrice) {
    const closeSide = side === 'LONG' ? 'SELL' : 'BUY'
    return await this.placeOrder({
      symbol,
      side: closeSide,
      type: 'STOP_MARKET',
      quantity,
      stopPrice: stopPrice.toFixed(2),
      positionSide: side,
      timeInForce: 'GTE_GTC',
      workingType: 'MARK_PRICE',
      closePosition: true
    })
  }

  // Place take profit order (TAKE_PROFIT_MARKET)
  async placeTakeProfit(symbol, side, quantity, takeProfitPrice) {
    const closeSide = side === 'LONG' ? 'SELL' : 'BUY'
    return await this.placeOrder({
      symbol,
      side: closeSide,
      type: 'TAKE_PROFIT_MARKET',
      quantity,
      stopPrice: takeProfitPrice.toFixed(2),
      positionSide: side,
      timeInForce: 'GTE_GTC',
      workingType: 'MARK_PRICE',
      closePosition: true
    })
  }

  // Cancel order by orderId
  async cancelOrder(symbol, orderId) {
    return await this._signedRequest('DELETE', '/fapi/v1/order', {
      symbol,
      orderId
    })
  }

  // Get open orders for a symbol
  async getOpenOrders(symbol = null) {
    const params = symbol ? { symbol } : {}
    return await this._signedRequest('GET', '/fapi/v1/openOrders', params)
  }

  // Get exchange info (available symbols)
  async getExchangeInfo() {
    try {
      const response = await axios.get(`${BASE_URL}/fapi/v1/exchangeInfo`)
      return response.data
    } catch (error) {
      console.error('Error fetching exchange info:', error.message)
      throw error
    }
  }

  // Get market price for symbol
  async getPrice(symbol) {
    try {
      const response = await axios.get(`${BASE_URL}/fapi/v1/ticker/price`, {
        params: { symbol }
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error.message)
      throw error
    }
  }

  // Get 24h ticker data
  async get24hTicker(symbol = null) {
    try {
      const params = symbol ? { symbol } : {}
      const response = await axios.get(`${BASE_URL}/fapi/v1/ticker/24hr`, { params })
      return response.data
    } catch (error) {
      console.error('Error fetching 24h ticker:', error.message)
      throw error
    }
  }

  // Get klines/candlestick data
  async getKlines(symbol, interval = '1h', limit = 24) {
    try {
      const response = await axios.get(`${BASE_URL}/fapi/v1/klines`, {
        params: { symbol, interval, limit }
      })
      return response.data
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error.message)
      throw error
    }
  }

  // Get all orders
  async getAllOrders(symbol) {
    return await this._signedRequest('GET', '/fapi/v1/allOrders', { symbol })
  }
}
