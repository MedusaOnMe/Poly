# 🎯 AI Prediction Arena

**Watch 4 AI models compete in real-time prediction market trading on Polymarket**

![Status](https://img.shields.io/badge/Status-Live-success)
![Platform](https://img.shields.io/badge/Platform-Polymarket-purple)
![Blockchain](https://img.shields.io/badge/Blockchain-Polygon-8247E5)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎮 Concept

Four AI traders, each powered by GPT-4o but with unique personas, compete against each other by trading on **Polymarket** - the world's largest prediction market platform. Each AI starts with $500 USDC and makes autonomous trading decisions every 3 minutes.

Instead of crypto futures, these AIs analyze and trade **real-world event predictions** - from politics to crypto to sports.

## 🏆 The Competitors

| AI | Emoji | Strategy | Edge Required | Trading Style |
|---|---|---|---|---|
| **🎯 GPT** | Balanced Fundamentalist | 10% | Analyzes probabilities using logic and data |
| **🔬 Claude** | Research-Driven Analyst | 15% | High-conviction only, quality over quantity |
| **⚡ DeepSeek** | Momentum Scalper | Variable | Quick trades on breaking news and volatility |
| **🎭 Grok** | Contrarian Fader | 15-20% | Fades crowd extremes (<20% or >80%) |

## ✨ Features

- **Real-time Prediction Trading**: Automated analysis of top 15 prediction markets
- **Live Dashboard**: React frontend showing active bets, settled trades, and 24h performance
- **Probability Analysis**: Each AI estimates true probability vs market price
- **Polymarket CLOB**: Direct integration with Polymarket's orderbook on Polygon
- **Firebase Sync**: Real-time database updates for instant UI refresh
- **4 Unique Strategies**: Each AI has its own probability estimation approach

## 🛠️ Tech Stack

- **Backend**: Node.js + Express + node-cron
- **Frontend**: React + Vite + TailwindCSS
- **Trading Platform**: Polymarket CLOB API
- **Blockchain**: Polygon (Chain ID 137)
- **AI**: OpenAI GPT-4o (all 4 traders)
- **Database**: Firebase Realtime Database
- **Payment**: USDC (Polygon)

## 📦 Installation

### Prerequisites

1. **4 Polygon Wallets** - Generate 4 Ethereum private keys
2. **$2,000 USDC** - $500 USDC per wallet on Polygon
3. **Token Approvals** - Approve Polymarket contracts (see below)
4. **Firebase Project** - Realtime Database enabled
5. **OpenAI API Key** - For GPT-4o AI decision making

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd poly-arena
npm install  # Installs both client and server dependencies
```

### 2. Create Wallets

Generate 4 Ethereum private keys:

```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
# Run this command 4 times to generate 4 keys
```

### 3. Fund Wallets

Send **$500 USDC** to each wallet on **Polygon** (Chain ID 137).

You can bridge from Ethereum to Polygon using the [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge).

### 4. Approve Polymarket Contracts (CRITICAL!)

For **EACH** of the 4 wallets, approve these token contracts:

**USDC Token:** `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

Approve these 3 spender contracts:
- `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
- `0xC5d563A36AE78145C45a50134d48A1215220f80a`
- `0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296`

**Conditional Tokens:** `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`

Approve the same 3 contracts above.

You can do this via Polymarket's UI or using an ethers.js script.

### 5. Environment Variables

Create `server/.env`:

```env
PORT=3000
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Polymarket Wallets (AI 1: GPT)
POLYMARKET_PRIVATE_KEY_1=0x...
POLYMARKET_FUNDER_1=0x...

# AI 2: Claude
POLYMARKET_PRIVATE_KEY_2=0x...
POLYMARKET_FUNDER_2=0x...

# AI 3: DeepSeek
POLYMARKET_PRIVATE_KEY_3=0x...
POLYMARKET_FUNDER_3=0x...

# AI 4: Grok
POLYMARKET_PRIVATE_KEY_4=0x...
POLYMARKET_FUNDER_4=0x...
```

Create `client/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 6. Run

**Development:**

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

Visit `http://localhost:5173`

**Production:**

```bash
npm run build  # Builds client
npm start      # Runs server (serves built client)
```

## 🚀 Deployment

### Railway / Render / Vercel

1. Push to GitHub
2. Connect repo to Railway/Render
3. Add all environment variables from `server/.env`
4. Deploy!

Railway will automatically:
- Run `npm install`
- Run `npm run build`
- Run `npm start`

## 🧠 How It Works

### Trading Loop (Every 3 minutes)

1. **Fetch Markets**: Get top 15 prediction markets from Polymarket Gamma API
2. **AI Analysis**: Each AI independently analyzes markets:
   - Read market question
   - Current YES/NO prices
   - Volume & liquidity
   - Days until resolution
3. **Probability Estimation**: Each AI estimates true probability
4. **Edge Calculation**: Compare estimate to market price
5. **Trade Decision**:
   - If edge > threshold → Buy underpriced outcome
   - Position size: 10-25% of capital
6. **Execution**: Place order on Polymarket CLOB (Polygon)
7. **P&L Update**: Calculate unrealized P&L every 2 minutes
8. **Settle**: When market resolves, winning shares pay $1.00

### Example Trade Flow

```
Market: "Will Bitcoin hit $100k by March?"
Current Price: 65% YES / 35% NO

GPT Analysis:
├─ Estimates true probability: 45%
├─ Edge: 20% (65% - 45%)
├─ Decision: Buy NO shares (underpriced)
├─ Spend: $75 (15% of $500)
├─ Receive: ~214 NO shares at $0.35
└─ Profit Scenarios:
   ├─ If NO wins: $214 (3x return)
   └─ If price drops to 55%: $43 profit (sell early)
```

## 📊 Strategy Differences

Each AI has a unique approach:

**🎯 GPT (Balanced):**
- Trades when edge > 10%
- Balanced position sizing (15-20%)
- Holds 2-7 days typically
- Focuses on fundamental probability

**🔬 Claude (Conservative):**
- Only trades with edge > 15%
- Smaller positions (10-15%)
- Deep research, high conviction
- Fewer but higher quality trades

**⚡ DeepSeek (Aggressive):**
- Reacts to breaking news
- Quick in/out (1-4 hours)
- Larger positions (20-25%)
- Capitalizes on volatility

**🎭 Grok (Contrarian):**
- Targets extremes (<20% or >80%)
- Fades crowd panic/euphoria
- Medium positions (15-25%)
- Patient mean reversion plays

## 📐 Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   React     │◄────►│   Express    │◄────►│  Polymarket     │
│  Dashboard  │      │   Backend    │      │  CLOB API       │
│  (Vite)     │      │  (Node.js)   │      │  (Polygon)      │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │                        │
                            ▼                        │
                     ┌──────────────┐               │
                     │   Firebase   │               │
                     │   Realtime   │      ┌────────▼────────┐
                     │   Database   │      │  Gamma Markets  │
                     └──────────────┘      │  API (Data)     │
                            │               └─────────────────┘
                            ▼
                     ┌──────────────┐
                     │  OpenAI API  │
                     │   (GPT-4o)   │
                     └──────────────┘
```

## 🎮 Dashboard Features

- **Live Ticker**: Scrolling prediction markets with prices
- **AI Cards**: Each AI's balance, P&L, win rate, last decision
- **24h Chart**: Performance chart for all 4 AIs
- **Active Bets**: Current positions with unrealized P&L
- **Model Chat**: Live feed of AI decisions and reasoning
- **Settled Bets**: Historical trades with P&L breakdown

## 📝 Database Schema (Firebase)

```javascript
/ai_traders/{aiId}
├─ balance: 500
├─ total_return: 0
├─ pnl_24h: 0
├─ total_trades: 0
├─ wins: 0
├─ losses: 0
└─ last_decision: "..."

/positions/{positionId}
├─ market_question: "Will Bitcoin..."
├─ outcome: "YES" | "NO"
├─ shares: 450
├─ entry_price: 0.62
├─ current_price: 0.68
├─ unrealized_pnl: 27.00
└─ days_to_resolution: 8

/trades/{tradeId}
├─ action: "BUY" | "SELL"
├─ market_question: "..."
├─ outcome: "YES" | "NO"
├─ shares: 450
├─ entry_price: 0.62
├─ exit_price: 0.68
├─ pnl: 27.00
└─ message: "AI reasoning..."

/market_data/{index}
├─ question: "..."
├─ yes_price: 0.68
├─ no_price: 0.32
├─ volume_24h: 50000
└─ category: "Crypto"
```

## 🔧 Scheduled Jobs

- **Trading Cycles**: Every 3 minutes
- **Balance Updates**: Every 2 minutes
- **P&L Updates**: Every 2 minutes
- **Market Data Refresh**: Every hour
- **Trade Cleanup**: Every 6 hours (keep last 200)

## ⚠️ Important Notes

- All 4 AIs use **GPT-4o** - personalities come from different system prompts
- Prediction markets move slower than crypto - 3min cycles vs 2min
- No leverage (1:1 shares), no stop loss/take profit
- Markets can take days/weeks/months to resolve
- AIs can sell positions early to realize profit/loss

## 📄 License

MIT

## 🙏 Credits

- Built with [Polymarket CLOB Client](https://github.com/Polymarket/clob-client)
- Powered by [OpenAI GPT-4o](https://openai.com)
- Real-time data via [Firebase](https://firebase.google.com)

---

**Disclaimer**: This is an experimental trading bot. Past performance does not guarantee future results. Trade at your own risk.
