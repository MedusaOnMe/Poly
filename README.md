# 🎮 AI Trading Arena

**Watch AI models battle it out in real-time perpetual futures trading on Aster DEX**

![Trading Arena](https://img.shields.io/badge/Status-Live-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Concept

Four AI traders, each with a unique personality and trading strategy, compete against each other with $500 each. All powered by GPT-4o but with different system prompts to create distinct behaviors.

### The Competitors

| AI | Persona | Strategy |
|---|---|---|
| 🤖 **GPT** | The Balanced Strategist | 50/50 risk/reward, trend-following |
| 🧠 **Claude** | The Risk-Averse Analyst | Capital preservation, tight stops |
| 📊 **DeepSeek** | The Data Scientist | Statistical analysis, volume patterns |
| 🎲 **Grok** | The Degen Gambler | High risk/reward, contrarian plays |

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React + Vite  │ ←──→ │  Express Server  │ ←──→ │   Aster DEX     │
│   (Frontend)    │      │  (Trading Engine)│      │   (4 Wallets)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         ↓                        ↓                          ↓
         └────────────────────────┴──────────────────────────┘
                                  ↓
                       ┌──────────────────────┐
                       │  Firebase Realtime   │
                       │  (Live Data Sync)    │
                       └──────────────────────┘
                                  ↓
                       ┌──────────────────────┐
                       │    OpenAI API        │
                       │   (GPT-4o)           │
                       └──────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **4 Aster DEX Accounts** - Each funded with $500 USDT
2. **Firebase Project** - Realtime Database enabled
3. **OpenAI API Key** - For GPT-4o AI decision making

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd "Aster Arena"

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### Configuration

#### 1. Frontend Environment

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

#### 2. Backend Environment

Create `server/.env`:

```env
PORT=3000
OPENAI_API_KEY=sk-...

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Aster DEX API Keys (4 wallets)
ASTER_API_KEY_1=...
ASTER_SECRET_KEY_1=...
ASTER_API_KEY_2=...
ASTER_SECRET_KEY_2=...
ASTER_API_KEY_3=...
ASTER_SECRET_KEY_3=...
ASTER_API_KEY_4=...
ASTER_SECRET_KEY_4=...
```

#### 3. Firebase Service Account (Optional)

If not using environment variables, place `firebase-service-account.json` in the server directory.

### Running Locally

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Visit `http://localhost:5173` to see the arena!

## 📦 Deployment - Super Simple!

### One Railway Site. That's It!

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "AI Trading Arena"
   git remote add origin https://github.com/yourusername/ai-trading-arena.git
   git push -u origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repo
   - Railway auto-detects everything!

3. **Add Environment Variables**:
   - Click on your deployed project → Variables tab
   - Add all the environment variables from your `server/.env` file:
     - `OPENAI_API_KEY`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_DATABASE_URL`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY` (keep quotes and \n characters)
     - All 8 Aster API keys (ASTER_API_KEY_1-4, ASTER_SECRET_KEY_1-4)

4. **Done!** 🎉
   - One URL serves both frontend and backend
   - Frontend: `https://your-app.up.railway.app/`
   - API: `https://your-app.up.railway.app/api/*`

That's it! Railway will automatically:
   - Install all dependencies (via postinstall script)
   - Build the React frontend
   - Start the Express server
   - The server serves both the API and the built frontend

## 🎨 Features

- **Real-time Updates**: Live balance, P&L, and position tracking
- **Performance Chart**: 24-hour rolling PnL visualization
- **Trade Feed**: Live stream of AI decisions and executions
- **Leaderboard**: See who's winning the competition
- **AI Insights**: Read each AI's reasoning for their trades
- **Responsive Design**: Works on desktop and mobile

## 🔧 Tech Stack

### Frontend
- React + Vite
- TailwindCSS (Premium dark theme)
- Chart.js (Performance graphs)
- Firebase SDK (Real-time listeners)

### Backend
- Node.js + Express
- Firebase Admin SDK
- OpenAI API (GPT-4o)
- Aster DEX API integration
- Technical Indicators (RSI, MACD, EMA, ATR)
- node-cron (Scheduled trading every 3 minutes)

## 📊 Data Structure (Firebase)

```
/
├── ai_traders/
│   ├── gpt/
│   │   ├── balance: 500
│   │   ├── pnl_history: [...]
│   │   ├── total_trades: 0
│   │   └── ...
│   ├── claude/
│   └── ...
├── positions/
│   └── {positionId}/
│       ├── ai_id: "gpt"
│       ├── symbol: "BTCUSDT"
│       ├── side: "LONG"
│       ├── unrealized_pnl: 12.34
│       └── ...
├── trades/
│   └── {tradeId}/
│       ├── ai_id: "gpt"
│       ├── action: "LONG"
│       ├── reasoning: "..."
│       └── ...
└── market_data/
    └── [...top 20 symbols]
```

## 🤖 AI Decision Flow

Every 3 minutes:

1. **Fetch Data**: Get account balance, positions, and market data
2. **Technical Analysis**: Calculate RSI, MACD, EMA, ATR on 3m and 4h timeframes
3. **AI Analysis**: Send context to GPT-4o with persona-specific prompt
4. **Decision**: AI returns JSON with action (LONG/SHORT/CLOSE/HOLD)
5. **Execution**: Place orders on Aster DEX with stop-loss and take-profit
6. **Logging**: Record trade and reasoning in Firebase
7. **Update UI**: Frontend auto-updates via real-time listeners

## 🛡️ Safety Features

- Max 3 positions per AI
- Position size limited to 10-30% of balance
- No scalping (minimum 1-hour holds enforced by AI prompts)
- Each AI has its own isolated wallet

## 📝 License

MIT - Do whatever you want with this!

## 🙏 Credits

- Inspired by [nof1.ai](https://nof1.ai)
- Built with Claude Code
- Trading on [Aster DEX](https://asterdex.com)

---

**Disclaimer**: This is an experimental project for educational purposes. Trade at your own risk!
