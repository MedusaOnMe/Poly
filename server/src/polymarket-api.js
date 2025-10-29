import { ClobClient, Side, OrderType } from '@polymarket/clob-client'
import { ethers } from 'ethers'
import axios from 'axios'

const CLOB_URL = 'https://clob.polymarket.com'
const GAMMA_API_URL = 'https://gamma-api.polymarket.com'
const DATA_API_URL = 'https://data-api.polymarket.com'
const CHAIN_ID = 137 // Polygon

// USDC contract on Polygon
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const USDC_ABI = ['function balanceOf(address) view returns (uint256)']

export class PolymarketAPI {
  /**
   * Initialize Polymarket API for MetaMask wallet trading
   *
   * WALLET ARCHITECTURE (MetaMask):
   * 1. Private Key → Derives EOA address (your MetaMask wallet)
   * 2. EOA Address → Used for authentication/signing (funderAddress param)
   * 3. Proxy Address → Created by Polymarket, holds USDC, used for trading
   *
   * EXAMPLE:
   * Private Key: 0x8297...d37f
   *      ↓ derives to
   * EOA Address: 0x5628...bDB60 (MetaMask wallet - authenticates)
   *      ↓ connected to Polymarket creates
   * Proxy Address: 0x31A1...4791 (Polymarket profile - trades & holds USDC)
   *
   * @param {string} privateKey - MetaMask private key (exported from wallet)
   * @param {string} funderAddress - EOA address derived from private key (MetaMask wallet address)
   * @param {string} proxyAddress - Polymarket proxy address (shown under profile picture)
   */
  constructor(privateKey, funderAddress, proxyAddress) {
    this.privateKey = privateKey
    this.funderAddress = funderAddress      // EOA/MetaMask address (for authentication)
    this.proxyAddress = proxyAddress        // Polymarket proxy (where USDC lives)
    this.client = null
    this.wallet = null
  }

  // Initialize the CLOB client with authentication
  async initialize() {
    try {
      // Check if private key is provided
      if (!this.privateKey) {
        throw new Error('Private key is not set in environment variables')
      }

      // Clean and validate private key
      let cleanKey = this.privateKey.trim()

      // Add 0x prefix if missing
      if (!cleanKey.startsWith('0x')) {
        cleanKey = '0x' + cleanKey
      }

      // Validate length (should be 66 chars: 0x + 64 hex chars)
      if (cleanKey.length !== 66) {
        throw new Error(`Invalid private key length: ${cleanKey.length} chars (expected 66). Check your .env file.`)
      }

      // Validate hex format
      if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
        throw new Error(`Invalid private key format. Must be 0x followed by 64 hexadecimal characters.`)
      }

      // Create wallet with provider (required for signing)
      const provider = new ethers.providers.JsonRpcProvider('https://polygon-mainnet.public.blastapi.io')
      this.wallet = new ethers.Wallet(cleanKey, provider)
      this.privateKey = cleanKey

      // Step 1: Create temporary client to derive API credentials
      const tempClient = new ClobClient(CLOB_URL, CHAIN_ID, this.wallet)

      // Step 2: Create or derive API key (registers wallet with Polymarket)
      console.log('Creating/deriving API credentials...')

      let apiCreds
      try {
        apiCreds = await tempClient.createOrDeriveApiKey()
        console.log(`   Raw API creds result:`, apiCreds ? `{key: ${apiCreds.key?.substring(0,8)}..., secret: ${apiCreds.secret ? 'present' : 'missing'}, passphrase: ${apiCreds.passphrase ? 'present' : 'missing'}}` : 'null/undefined')
      } catch (error) {
        console.error(`   ❌ Error calling createOrDeriveApiKey():`, error.message)
        throw new Error(`Failed to create/derive API key: ${error.message}`)
      }

      // Validate API credentials were successfully created/derived
      if (!apiCreds || !apiCreds.key || !apiCreds.secret || !apiCreds.passphrase) {
        throw new Error(`Failed to derive API credentials. Got: ${JSON.stringify(apiCreds)}. This wallet may not be registered with Polymarket yet. Please connect wallet ${this.wallet.address} to https://polymarket.com first.`)
      }

      console.log(`✅ API credentials obtained successfully (key: ${apiCreds.key.substring(0, 8)}...)`)

      // Step 3: Create final client with proper constructor signature
      // ClobClient(host, chainId, signer, apiCreds, signatureType, proxyAddress)
      // For MetaMask wallets: signatureType=2, proxyAddress=Polymarket profile address (where USDC lives)
      this.client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        this.wallet,        // Wallet object (not string!)
        apiCreds,           // API credentials from step 2
        2,                  // Signature type: 2 for Browser Wallet (MetaMask)
        this.proxyAddress   // Proxy address (shown on Polymarket profile, where USDC is held)
      )

      console.log(`✅ Polymarket client initialized for ${this.wallet.address}`)
      console.log(`   Funder: ${this.funderAddress}`)
      console.log(`   Proxy: ${this.proxyAddress || 'N/A'}`)
      return true
    } catch (error) {
      console.error('Error initializing Polymarket client:', error.message)
      throw error
    }
  }

  // Get USDC balance on Polygon
  async getBalance() {
    try {
      // Use CLOB client's balance endpoint if available
      // Otherwise we'll track balance via Firebase
      // For now, return a placeholder - balance will be managed in Firebase
      return {
        balance: 0, // Will be updated from Firebase
        address: this.funderAddress
      }
    } catch (error) {
      console.error('Error fetching balance:', error.message)
      throw error
    }
  }

  // Check allowances for USDC and conditional tokens
  async checkAllowances() {
    try {
      console.log('📋 Checking allowances for proxy wallet:', this.proxyAddress)

      // Check if getAllowances method exists in CLOB client
      if (this.client && typeof this.client.getAllowances === 'function') {
        const allowances = await this.client.getAllowances()
        console.log('✅ Allowances:', allowances)
        return allowances
      }

      // If not available, log warning
      console.log('⚠️  getAllowances() not available in CLOB client')
      console.log('   This might be why orders are failing - proxy wallet may not have approved Exchange contract')
      console.log('   You may need to approve USDC spending via Polymarket UI first')

      return null
    } catch (error) {
      console.error('❌ Error checking allowances:', error.message)
      return null
    }
  }

  // Set allowances for USDC (required before placing orders with MetaMask wallets)
  async setAllowances() {
    try {
      console.log('🔐 Setting USDC allowance for Exchange contract...')

      if (!this.client || typeof this.client.updateBalanceAllowance !== 'function') {
        console.error('❌ updateBalanceAllowance() not available in CLOB client')
        return false
      }

      // Set USDC allowance (required for buying)
      // asset_type: 'COLLATERAL' for USDC, 'CONDITIONAL' for outcome tokens
      await this.client.updateBalanceAllowance({
        asset_type: 'COLLATERAL'
      })

      console.log('✅ USDC allowance set successfully! You can now place buy orders.')
      return true

    } catch (error) {
      console.error('❌ Error setting allowances:', error.message)
      console.error('   Full error:', error)
      return false
    }
  }

  // Set allowances for conditional tokens (required before selling positions)
  // tokenId: The specific ERC1155 token ID to approve (REQUIRED for conditional tokens)
  async setConditionalTokenAllowance(tokenId) {
    try {
      if (!tokenId) {
        console.error('❌ token_id is required for conditional token allowance')
        return false
      }

      console.log(`🔐 Setting conditional token allowance for token ${tokenId.substring(0, 20)}...`)

      if (!this.client || typeof this.client.updateBalanceAllowance !== 'function') {
        console.error('❌ updateBalanceAllowance() not available in CLOB client')
        return false
      }

      // Set conditional token allowance (required for selling)
      // IMPORTANT: Must pass token_id for ERC1155 conditional tokens
      await this.client.updateBalanceAllowance({
        asset_type: 'CONDITIONAL',
        token_id: tokenId
      })

      console.log('✅ Conditional token allowance set successfully!')
      return true

    } catch (error) {
      console.error('❌ Error setting conditional token allowance:', error.message)
      console.error('   Full error:', error.response?.data || error)
      return false
    }
  }

  // Get active prediction markets from Gamma API
  async getActiveMarkets(options = {}) {
    try {
      const {
        limit = 20,
        minVolume = 10000,
        minLiquidity = 50000,
        active = true
      } = options

      const response = await axios.get(`${GAMMA_API_URL}/markets`, {
        params: {
          active,
          closed: false,
          limit: 100 // Fetch more, then filter
        }
      })

      let markets = response.data

      // Filter by volume, liquidity, and valid price data
      markets = markets.filter(market => {
        // Basic filters
        if (market.volumeNum < minVolume ||
            market.liquidityNum < minLiquidity ||
            market.active !== true ||
            market.closed !== false) {
          return false
        }

        // Check for valid outcome prices
        if (!market.outcomePrices) {
          return false
        }

        try {
          const prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices

          // Ensure prices exist and are valid (between 0 and 1)
          if (!prices || prices.length < 2) return false

          const price1 = Number(prices[0])
          const price2 = Number(prices[1])

          // Filter out invalid prices or extreme prices (can't trade on Polymarket)
          // Polymarket limits: 0.01 to 0.99
          // We filter more conservatively: 0.03 to 0.97 to avoid edge cases
          if (price1 <= 0.03 || price1 >= 0.97 || price2 <= 0.03 || price2 >= 0.97) {
            return false
          }

          return true
        } catch {
          return false
        }
      })

      // Sort by volume descending
      markets.sort((a, b) => b.volumeNum - a.volumeNum)

      // Take top N markets
      markets = markets.slice(0, limit)

      // Debug: Log first few markets to see what we're getting
      if (markets.length > 0) {
        console.log(`📊 Fetched ${markets.length} markets. Top 3:`)
        markets.slice(0, 3).forEach(m => {
          console.log(`  - ${m.question} | Prices: ${m.outcomePrices} | Token IDs: ${m.clobTokenIds} | Vol: $${(m.volumeNum/1000).toFixed(0)}k`)
        })
      }

      // Transform to our format
      return markets.map(market => {
        // Parse token IDs (might be string or array)
        let tokenIds = []
        if (market.clobTokenIds) {
          if (typeof market.clobTokenIds === 'string') {
            try {
              tokenIds = JSON.parse(market.clobTokenIds)
            } catch {
              // If parse fails, might be comma-separated
              tokenIds = market.clobTokenIds.split(',').map(id => id.trim())
            }
          } else if (Array.isArray(market.clobTokenIds)) {
            tokenIds = market.clobTokenIds
          }
        }

        const yesPrice = this._extractPrice(market, 'Yes')
        const noPrice = this._extractPrice(market, 'No')

        return {
          id: market.id || market.marketSlug,
          question: market.question,
          slug: market.slug,
          description: market.description,
          outcomes: market.outcomes || ['Yes', 'No'],
          outcomePrices: [yesPrice, noPrice], // Use extracted prices
          yes_price: yesPrice,
          no_price: noPrice,
          volume_24h: market.volume24hr || market.volumeNum || 0,
          liquidity: market.liquidityNum || 0,
          category: market.category || 'General',
          end_date: market.endDate || market.endDateIso,
          days_to_resolution: this._calculateDaysToResolution(market.endDate || market.endDateIso),
          token_ids: tokenIds,
          active: market.active,
          closed: market.closed
        }
      })
    } catch (error) {
      console.error('Error fetching active markets:', error.message)
      throw error
    }
  }

  // Helper to extract Yes/No prices
  _extractPrice(market, outcome) {
    try {
      // Try different possible field names and formats
      let prices = []
      let outcomes = []

      // Parse outcomes (might be JSON string or array)
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes)
        } catch {
          outcomes = ['Yes', 'No']
        }
      } else if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes
      } else {
        outcomes = ['Yes', 'No']
      }

      // Parse prices (might be JSON string or array)
      if (market.outcomePrices) {
        if (typeof market.outcomePrices === 'string') {
          try {
            // Try parsing as JSON first
            const parsed = JSON.parse(market.outcomePrices)
            prices = parsed.map(Number)
          } catch {
            // Fall back to comma-split
            prices = market.outcomePrices.split(',').map(Number)
          }
        } else if (Array.isArray(market.outcomePrices)) {
          prices = market.outcomePrices.map(Number)
        }
      } else if (market.outcomes_prices) {
        prices = market.outcomes_prices
      } else if (market.lastPrices) {
        prices = market.lastPrices
      }

      if (prices.length > 0 && outcomes.length > 0) {
        const index = outcomes.findIndex(o => o.toLowerCase() === outcome.toLowerCase())
        return index >= 0 && prices[index] ? prices[index] : 0.5
      }

      return 0.5
    } catch (error) {
      console.log('Price extraction error:', error.message)
      return 0.5
    }
  }

  // Calculate days until market resolution
  _calculateDaysToResolution(endDate) {
    if (!endDate) return null
    try {
      const end = new Date(endDate)
      const now = new Date()
      const diffTime = end - now
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    } catch {
      return null
    }
  }

  // Get specific market details
  async getMarketDetails(marketId) {
    try {
      const response = await axios.get(`${GAMMA_API_URL}/markets/${marketId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error.message)
      throw error
    }
  }

  // Get order book for a token
  async getOrderBook(tokenId) {
    try {
      const orderBook = await this.client.getOrderBook(tokenId)
      return orderBook
    } catch (error) {
      console.error(`Error fetching order book for token ${tokenId}:`, error.message)
      throw error
    }
  }

  // Get current price for a token (mid-market)
  async getPrice(tokenId) {
    try {
      const price = await this.client.getMidpoint(tokenId)
      const numPrice = parseFloat(price)

      console.log(`🔍 getPrice(${tokenId.substring(0, 20)}...): raw="${price}" parsed=${numPrice}`)

      if (isNaN(numPrice)) {
        throw new Error(`Invalid price returned: ${price} (parsed to NaN)`)
      }

      return numPrice
    } catch (error) {
      console.error(`❌ Error fetching price for token ${tokenId}:`, error.message)
      throw error
    }
  }

  // Buy shares (market order)
  async buyShares(tokenId, amount, marketPrice) {
    try {
      // Use market price + 5% slippage to ensure execution
      const maxPrice = Math.min(marketPrice * 1.05, 0.99)

      // Round price to tick size (0.01 = 2 decimals)
      const roundedPrice = parseFloat(maxPrice.toFixed(2))

      // Round USD amount to 2 decimals (USDC has 6 decimals but CLOB wants max 2)
      const roundedAmount = parseFloat(amount.toFixed(2))

      console.log(`📈 Attempting buy: $${roundedAmount} at max price ${roundedPrice}`)

      // Log order parameters for debugging
      console.log(`   Order params:`)
      console.log(`     tokenID: ${tokenId}`)
      console.log(`     side: BUY`)
      console.log(`     amount (USD): ${roundedAmount}`)
      console.log(`     price: ${roundedPrice}`)
      console.log(`     feeRateBps: 0`)
      console.log(`     nonce: 0`)
      console.log(`     signatureType: 2 (Browser Wallet/MetaMask)`)
      console.log(`     signer: ${this.funderAddress}`)
      console.log(`     funder: ${this.proxyAddress}`)

      // Create market buy order (GTC = Good Till Cancelled, fills partial orders)
      // Pass USD amount (max 2 decimals), let SDK calculate shares
      const order = await this.client.createMarketOrder({
        side: Side.BUY,
        tokenID: tokenId,
        amount: roundedAmount, // USD amount (max 2 decimals)
        feeRateBps: 0,
        nonce: 0,
        price: roundedPrice // Max price with 5% slippage (rounded to tick size)
      }, { tickSize: "0.01" })

      console.log(`   ✅ Order created successfully`)
      console.log(`   Order object:`, JSON.stringify(order, null, 2))

      // Post the order to the exchange
      console.log(`   📤 Posting order to exchange...`)
      const resp = await this.client.postOrder(order, OrderType.FOK)

      // Check if order actually executed
      if (!resp || !resp.success || resp.errorMsg) {
        const errorMsg = resp?.errorMsg || 'Order failed - no success confirmation'
        console.error(`❌ Buy order FAILED: ${errorMsg}`)
        throw new Error(`Order failed: ${errorMsg}`)
      }

      console.log(`✅ Buy order executed: $${roundedAmount} at ~$${marketPrice.toFixed(3)}`)
      console.log(`   Order ID: ${resp.orderID || 'N/A'}`)
      return resp
    } catch (error) {
      // Preserve FOK/liquidity error messages for better error handling
      if (error.response?.data?.error) {
        const clobError = error.response.data.error
        console.error('Error buying shares:', clobError)
        throw new Error(clobError)
      }
      console.error('Error buying shares:', error.message)
      throw error
    }
  }

  // Sell shares (market order)
  async sellShares(tokenId, shares, marketPrice) {
    try {
      // Use market price - 5% slippage to ensure execution
      const minPrice = Math.max(marketPrice * 0.95, 0.01)

      // Round price to tick size (0.01 = 2 decimals)
      const roundedPrice = parseFloat(minPrice.toFixed(2))

      // DO NOT round shares - use EXACT amount from Data API to prevent "not enough balance" errors
      // Polymarket accepts fractional shares with high precision
      console.log(`📉 Attempting sell: ${shares} shares at market price ${marketPrice.toFixed(3)}, min price ${roundedPrice}`)

      // Create market sell order using createOrder
      // FAK = Fill-And-Kill - executes immediately for as many shares as available, cancels the rest
      const order = await this.client.createOrder({
        side: Side.SELL,
        tokenID: tokenId,
        size: shares, // EXACT shares from Data API (not rounded!)
        feeRateBps: 0,
        nonce: 0,
        price: roundedPrice // Min price with 5% slippage
      })

      // Post the order to the exchange as FAK (Fill-And-Kill)
      const resp = await this.client.postOrder(order, OrderType.FAK)

      // Check if order was accepted
      if (!resp || !resp.success || resp.errorMsg) {
        const errorMsg = resp?.errorMsg || 'Order failed - no success confirmation'
        console.error(`❌ Sell order FAILED: ${errorMsg}`)
        throw new Error(`Order failed: ${errorMsg}`)
      }

      console.log(`✅ Sell order executed: ${shares} shares at min $${roundedPrice} (FAK)`)
      console.log(`   Order ID: ${resp.orderID || 'N/A'}`)
      return resp
    } catch (error) {
      if (error.response?.data?.error) {
        const clobError = error.response.data.error
        console.error('Error selling shares:', clobError)
        throw new Error(clobError)
      }
      console.error('Error selling shares:', error.message)
      throw error
    }
  }

  // Get open orders (positions)
  async getOpenOrders() {
    try {
      const orders = await this.client.getOrders({ all: false })
      return orders
    } catch (error) {
      console.error('Error fetching open orders:', error.message)
      throw error
    }
  }

  // Get user's trade history
  async getUserTrades() {
    try {
      const trades = await this.client.getTrades({})
      return trades
    } catch (error) {
      console.error('Error fetching user trades:', error.message)
      throw error
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      await this.client.cancel(orderId)
      console.log(`❌ Order cancelled: ${orderId}`)
      return true
    } catch (error) {
      console.error('Error cancelling order:', error.message)
      throw error
    }
  }

  // Cancel all open orders
  async cancelAllOrders() {
    try {
      await this.client.cancelAll()
      console.log('❌ All orders cancelled')
      return true
    } catch (error) {
      console.error('Error cancelling all orders:', error.message)
      throw error
    }
  }

  // Get last trade price for a token
  async getLastTradePrice(tokenId) {
    try {
      const price = await this.client.getLastTradePrice(tokenId)
      return parseFloat(price)
    } catch (error) {
      console.error(`Error fetching last trade price for token ${tokenId}:`, error.message)
      throw error
    }
  }

  // Check if client is initialized
  isInitialized() {
    return this.client !== null
  }

  // ========================================
  // DATA API METHODS (Real-time user data)
  // ========================================

  // Get user's current positions from Data API
  async getUserPositions() {
    try {
      if (!this.proxyAddress) {
        throw new Error('Proxy address not set')
      }

      // IMPORTANT: Query positions for PROXY address, not EOA!
      // Positions are held in the proxy wallet, not the signer wallet
      const response = await axios.get(`${DATA_API_URL}/positions`, {
        params: {
          user: this.proxyAddress,  // Use proxy, not this.wallet.address (EOA)
          limit: 100  // Get up to 100 positions
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching user positions from Data API:', error.message)
      return []
    }
  }

  // Get user's total portfolio value from Data API
  async getUserPortfolioValue() {
    try {
      if (!this.proxyAddress) {
        throw new Error('Proxy address not set')
      }

      // IMPORTANT: Query portfolio for PROXY address, not EOA!
      const response = await axios.get(`${DATA_API_URL}/value`, {
        params: {
          user: this.proxyAddress  // Use proxy, not this.wallet.address (EOA)
        }
      })

      // Response format: [{ user: string, value: number }]
      return response.data?.[0]?.value || 0
    } catch (error) {
      console.error('Error fetching user portfolio value from Data API:', error.message)
      return 0
    }
  }

  // Get user's trade history from Data API
  async getUserTrades(limit = 50) {
    try {
      if (!this.proxyAddress) {
        throw new Error('Proxy address not set')
      }

      // Trades are associated with proxy address (where actual trading happens)
      const response = await axios.get(`${DATA_API_URL}/trades`, {
        params: {
          user: this.proxyAddress,  // Use proxy, not EOA
          limit: limit
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching user trades from Data API:', error.message)
      return []
    }
  }

  // Get real USDC balance from the proxy wallet (on-chain balance)
  async getProxyUSDCBalance() {
    try {
      // Use proxy address if provided, otherwise fall back to EOA wallet
      const addressToCheck = this.proxyAddress || this.wallet?.address

      if (!addressToCheck) {
        console.error('No wallet address available to check balance')
        return 0
      }

      // Connect to Polygon
      const provider = new ethers.providers.JsonRpcProvider('https://polygon-mainnet.public.blastapi.io')
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)

      // Get USDC balance (6 decimals)
      const balance = await usdcContract.balanceOf(addressToCheck)
      const balanceFormatted = ethers.utils.formatUnits(balance, 6)

      return parseFloat(balanceFormatted)
    } catch (error) {
      console.error('Error fetching proxy USDC balance:', error.message)
      return 0
    }
  }
}
