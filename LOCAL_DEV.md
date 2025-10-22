# 💻 Local Development Guide

## 🚀 Quick Start - Run Locally

### Step 1: Install Dependencies

```bash
# Install both client and server dependencies
cd client
npm install

cd ../server
npm install
```

### Step 2: Configure Environment Variables

#### Frontend Environment (`client/.env`)

Create `client/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### Backend Environment (`server/.env`)

Create `server/.env`:

```env
PORT=3000

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----\n"

# Aster DEX API Keys (5 wallets)
ASTER_API_KEY_1=your_api_key_1
ASTER_SECRET_KEY_1=your_secret_key_1
ASTER_API_KEY_2=your_api_key_2
ASTER_SECRET_KEY_2=your_secret_key_2
ASTER_API_KEY_3=your_api_key_3
ASTER_SECRET_KEY_3=your_secret_key_3
ASTER_API_KEY_4=your_api_key_4
ASTER_SECRET_KEY_4=your_secret_key_4
ASTER_API_KEY_5=your_api_key_5
ASTER_SECRET_KEY_5=your_secret_key_5
```

### Step 3: Run Development Servers

#### Option A: Two Terminals (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

You should see:
```
🎮 AI TRADING ARENA SERVER
Server running on port 3000
✅ AI traders initialized
✅ All systems operational!
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

**Open:** http://localhost:5173

---

#### Option B: Production Mode (Test Full Integration)

This simulates how it works on Railway:

**Step 1 - Build Frontend:**
```bash
cd client
npm run build
```

This creates `client/dist/` with the built React app.

**Step 2 - Start Server:**
```bash
cd ../server
npm start
```

Server now serves both API and built frontend!

**Open:** http://localhost:3000

---

## 🔍 Verify Everything Works

### 1. Frontend Should Show:
- ✅ "CONNECTED" status (green dot)
- ✅ Ticker strip scrolling with market data
- ✅ 5 AI trader cards
- ✅ No errors in browser console (F12)

### 2. Backend Should Show:
```
✅ Aster API clients initialized for all AI traders
📊 Market data updated: 20 symbols
✅ AI traders already initialized in database
📅 Scheduled jobs:
   - Trading cycles: Every 5 minutes
   - P&L updates: Every 1 minute
   - Market data: Every 30 seconds
✅ All systems operational!
```

### 3. Test the API

Open new terminal and test endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Get AI traders
curl http://localhost:3000/api/traders

# Get positions
curl http://localhost:3000/api/positions

# Trigger test cycle
curl -X POST http://localhost:3000/api/trigger-cycle
```

### 4. Check Firebase

Open Firebase Console → Realtime Database

You should see data under:
- `ai_traders/`
- `market_data/`
- `positions/` (after first trades)
- `trades/` (after first trades)

---

## 🐛 Troubleshooting

### Frontend won't start

**Error:** `Cannot find module 'firebase'`
```bash
cd client
npm install
```

**Error:** Tailwind errors
```bash
cd client
npm install -D @tailwindcss/postcss
# Restart dev server
```

### Backend won't start

**Error:** `Cannot find module 'openai'`
```bash
cd server
npm install
```

**Error:** Firebase errors
- Check `server/.env` has all Firebase variables
- Verify `FIREBASE_PRIVATE_KEY` includes `\n` characters

**Error:** Aster API errors
- Verify all 10 Aster variables are set (5 keys + 5 secrets)
- Check API keys are correct (no spaces)

### Frontend shows "CONNECTING..."

1. Check backend is running (`npm run dev` in server/)
2. Verify Firebase config in `client/.env`
3. Check browser console for errors
4. Verify Firebase Realtime Database is enabled

### "CORS error"

If using two separate servers (dev mode):
- Backend already has CORS enabled
- This shouldn't happen, but if it does, check `server/src/server.js` has CORS middleware

---

## 🧪 Test Trading Cycle

Want to see the AIs make decisions right away?

**Option 1 - Manual Trigger:**
```bash
curl -X POST http://localhost:3000/api/trigger-cycle
```

Watch the backend logs - you'll see each AI analyzing and making decisions!

**Option 2 - Wait 5 Minutes:**
The cron job will automatically run the trading cycle.

---

## 📁 Project Structure

```
/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── App.jsx        # Main app
│   │   ├── firebase.js    # Firebase client config
│   │   └── index.css      # Tailwind + custom styles
│   ├── .env               # Frontend env vars
│   └── package.json
│
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── aster-api.js   # Aster DEX wrapper
│   │   ├── ai-traders.js  # AI personas + OpenAI
│   │   ├── firebase.js    # Firebase helpers
│   │   ├── trading-engine.js # Trading logic
│   │   └── server.js      # Express + cron
│   ├── .env               # Backend env vars
│   └── package.json
│
└── package.json            # Root package (for Railway)
```

---

## 🔄 Development Workflow

### Making Changes

**Frontend Changes:**
- Edit files in `client/src/`
- Vite hot-reloads automatically
- Refresh browser to see changes

**Backend Changes:**
- Edit files in `server/src/`
- Server auto-restarts (using `--watch` flag)
- Check terminal for errors

### Before Deploying

1. **Test locally in production mode:**
   ```bash
   cd client && npm run build
   cd ../server && npm start
   ```

2. **Verify no errors**

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

4. **Railway auto-deploys!**

---

## 💡 Tips

### Stop the Servers

Press `Ctrl+C` in each terminal window

### Clear Browser Cache

If you see old data:
- Chrome: `Ctrl+Shift+R` (hard refresh)
- Or open DevTools → Application → Clear storage

### Monitor Firebase Usage

Firebase Console → Usage tab
- Should be well under free tier limits
- ~100-500 reads/writes per minute

### Monitor OpenAI Costs

https://platform.openai.com/usage
- With gpt-4o-mini: ~$0.10-0.50 per trading cycle
- 288 cycles/day = ~$30-150/day if running continuously
- Reduce frequency to save costs

---

## 🎯 Next Steps

Once local dev works:
1. Read [SIMPLE_DEPLOY.md](SIMPLE_DEPLOY.md)
2. Push to GitHub
3. Deploy on Railway
4. Watch AIs trade for real! 💰

---

**Need help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
