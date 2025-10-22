import dotenv from 'dotenv'
import { AsterAPI } from './src/aster-api.js'

dotenv.config()

async function checkClaudeBalance() {
  console.log('🔍 Checking Claude (Wallet 2) balance details...\n')

  const apiKey = process.env.ASTER_API_KEY_2
  const secretKey = process.env.ASTER_SECRET_KEY_2

  if (!apiKey || !secretKey) {
    console.log('❌ API keys not found')
    return
  }

  try {
    const api = new AsterAPI(apiKey, secretKey)
    const accountData = await api.getAccount()

    console.log('=== ACCOUNT SUMMARY ===')
    console.log(`totalWalletBalance: $${parseFloat(accountData.totalWalletBalance).toFixed(2)}`)
    console.log(`totalMarginBalance: $${parseFloat(accountData.totalMarginBalance).toFixed(2)}`)
    console.log(`totalCrossWalletBalance: $${parseFloat(accountData.totalCrossWalletBalance).toFixed(2)}`)
    console.log(`totalUnrealizedProfit: $${parseFloat(accountData.totalUnrealizedProfit).toFixed(2)}`)
    console.log(`totalInitialMargin: $${parseFloat(accountData.totalInitialMargin).toFixed(2)}`)
    console.log(`totalMaintMargin: $${parseFloat(accountData.totalMaintMargin).toFixed(2)}`)
    console.log(`availableBalance: $${parseFloat(accountData.availableBalance).toFixed(2)}`)
    console.log(`maxWithdrawAmount: $${parseFloat(accountData.maxWithdrawAmount).toFixed(2)}`)

    // Get current BNB price to calculate BNB value
    const bnbPrice = await api.getPrice('BNBUSDT')
    const bnbPriceUSD = parseFloat(bnbPrice.price)
    console.log(`\n=== BNB PRICE ===`)
    console.log(`Current BNB price: $${bnbPriceUSD.toFixed(2)}`)

    // Find BNB and USDT assets
    const bnbAsset = accountData.assets.find(a => a.asset === 'BNB')
    const usdtAsset = accountData.assets.find(a => a.asset === 'USDT')

    if (bnbAsset || usdtAsset) {
      console.log(`\n=== ASSET BREAKDOWN ===`)
      if (usdtAsset) {
        console.log(`USDT walletBalance: $${parseFloat(usdtAsset.walletBalance).toFixed(2)}`)
      }
      if (bnbAsset) {
        const bnbWalletBalance = parseFloat(bnbAsset.walletBalance)
        const bnbValueUSD = bnbWalletBalance * bnbPriceUSD
        console.log(`BNB walletBalance: ${bnbWalletBalance.toFixed(8)} BNB`)
        console.log(`BNB value in USD: $${bnbValueUSD.toFixed(2)}`)

        // Calculate what Aster might be showing
        const usdtBalance = usdtAsset ? parseFloat(usdtAsset.walletBalance) : 0
        const calculatedTotal = usdtBalance + bnbValueUSD
        console.log(`\nCalculated total (USDT + BNB): $${calculatedTotal.toFixed(2)}`)
        console.log(`API totalWalletBalance: $${parseFloat(accountData.totalWalletBalance).toFixed(2)}`)
        console.log(`Difference: $${(calculatedTotal - parseFloat(accountData.totalWalletBalance)).toFixed(2)}`)
      }
    }

    console.log('\n=== NON-ZERO ASSETS ===')
    const nonZeroAssets = accountData.assets.filter(a =>
      parseFloat(a.walletBalance) !== 0 ||
      parseFloat(a.marginBalance) !== 0 ||
      parseFloat(a.crossWalletBalance) !== 0 ||
      parseFloat(a.availableBalance) !== 0
    )

    if (nonZeroAssets.length === 0) {
      console.log('No assets with non-zero balances found')
    } else {
      nonZeroAssets.forEach(asset => {
        console.log(`\n${asset.asset}:`)
        console.log(`  walletBalance: ${asset.walletBalance}`)
        console.log(`  marginBalance: ${asset.marginBalance}`)
        console.log(`  crossWalletBalance: ${asset.crossWalletBalance}`)
        console.log(`  availableBalance: ${asset.availableBalance}`)
        console.log(`  unrealizedProfit: ${asset.unrealizedProfit}`)
        console.log(`  marginAvailable: ${asset.marginAvailable}`)
      })
    }

    console.log('\n=== ACTIVE POSITIONS ===')
    const activePositions = accountData.positions.filter(p =>
      parseFloat(p.positionAmt) !== 0 ||
      parseFloat(p.unrealizedProfit) !== 0
    )

    if (activePositions.length === 0) {
      console.log('No active positions')
    } else {
      activePositions.forEach(pos => {
        console.log(`\n${pos.symbol} ${pos.positionSide}:`)
        console.log(`  positionAmt: ${pos.positionAmt}`)
        console.log(`  entryPrice: ${pos.entryPrice}`)
        console.log(`  notional: ${pos.notional}`)
        console.log(`  leverage: ${pos.leverage}`)
        console.log(`  unrealizedProfit: ${pos.unrealizedProfit}`)
        console.log(`  initialMargin: ${pos.initialMargin}`)
        console.log(`  maintMargin: ${pos.maintMargin}`)
      })
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

checkClaudeBalance()
