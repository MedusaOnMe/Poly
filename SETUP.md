# 🚀 Setup Guide - AI Trading Arena

Complete step-by-step guide to get your AI trading arena up and running.

## 📋 Prerequisites Checklist

Before you begin, you'll need:

- [ ] 5 Aster DEX accounts (each funded with $500 USDT)
- [ ] Firebase account (free tier works fine)
- [ ] OpenAI API key
- [ ] Railway account (for deployment) or local Node.js environment
- [ ] Git installed

## 🔧 Step 1: Aster DEX Setup

### Create 5 Wallets

1. Go to [Aster DEX](https://www.asterdex.com)
2. Create 5 separate accounts (use different wallets/emails)
3. Fund each account with $500 USDT
4. For each account, create API keys:
   - Navigate to **API Management**
   - Click **Create API**
   - Label them: GPT, Claude, DeepSeek, Grok, Gemini
   - **IMPORTANT**: Copy the API Key and Secret Key immediately (secret only shown once!)
   - Save them securely

### API Key Permissions

Make sure each API key has:
- ✅ Read access
- ✅ Write access (for trading)
- ❌ Withdrawal disabled (for security)

Recommended: Bind API keys to specific IP addresses if you know your server IP.

## 🔥 Step 2: Firebase Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project**
3. Name it: `ai-trading-arena` (or your choice)
4. Disable Google Analytics (not needed)
5. Click **Create Project**

### Enable Realtime Database

1. In Firebase Console, go to **Realtime Database**
2. Click **Create Database**
3. Choose location (closest to your users)
4. Start in **Test Mode** (we'll secure it later)
5. Click **Enable**

### Get Firebase Configuration

#### For Frontend (Web Config)

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web** icon (</>)
4. Register app: `ai-arena-client`
5. Copy the config object - you'll need:
   - `apiKey`
   - `authDomain`
   - `databaseURL`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

#### For Backend (Service Account)

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. **Option A**: Save as `server/firebase-service-account.json` (don't commit to git!)
5. **Option B**: Extract values for environment variables:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

### Database Security Rules (Optional but Recommended)

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```

For production, only allow server writes, public reads.

## 🤖 Step 3: OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Name it: `ai-trading-arena`
6. Copy and save the key (starts with `sk-`)

**Cost estimate**: Using `gpt-4o-mini`, expect ~$0.50-2.00 per day depending on trading frequency.

## ⚙️ Step 4: Configuration

### Frontend Environment

Create `client/.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Backend Environment

Create `server/.env`:

```env
# Server
PORT=3000
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Firebase (Option A: Environment Variables)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"

# Aster DEX API Keys (5 wallets)
ASTER_API_KEY_1=your_gpt_api_key
ASTER_SECRET_KEY_1=your_gpt_secret_key

ASTER_API_KEY_2=your_claude_api_key
ASTER_SECRET_KEY_2=your_claude_secret_key

ASTER_API_KEY_3=your_deepseek_api_key
ASTER_SECRET_KEY_3=your_deepseek_secret_key

ASTER_API_KEY_4=your_grok_api_key
ASTER_SECRET_KEY_4=your_grok_secret_key

ASTER_API_KEY_5=your_gemini_api_key
ASTER_SECRET_KEY_5=your_gemini_secret_key
```

**Note**: If using `firebase-service-account.json` file, you can omit the Firebase env vars.

## 🏃 Step 5: Local Testing

### Install Dependencies

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

### Run Locally

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Verify Setup

1. Frontend should show "CONNECTING..." then "CONNECTED"
2. Backend logs should show:
   - ✅ Aster API clients initialized
   - ✅ AI traders initialized in database
   - ✅ Market data updated
3. Check Firebase console - data should appear in Realtime Database

### Trigger Manual Test

```bash
curl -X POST http://localhost:3000/api/trigger-cycle
```

Watch the logs! You should see AIs making decisions.

## 🚂 Step 6: Railway Deployment

### Backend Deployment

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. Click **New Project** → **Deploy from GitHub repo**
4. Select your repository
5. Click **Add variables** and paste all variables from `server/.env`
6. Under **Settings**:
   - Root Directory: `/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
7. Click **Deploy**

### Frontend Deployment

**Option A: Railway (Simple)**

1. Same Railway project, click **New Service**
2. Select same GitHub repo
3. Add Firebase env variables
4. Under **Settings**:
   - Root Directory: `/client`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
5. Deploy

**Option B: Vercel (Recommended for Frontend)**

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repo
3. Set Root Directory: `client`
4. Add all `VITE_*` environment variables
5. Deploy

## ✅ Step 7: Verify Production

1. Open your deployed frontend URL
2. Check Firebase database has data
3. Monitor Railway logs for backend
4. Wait 5 minutes for first automated trading cycle
5. Watch the AIs compete! 🎉

## 🔒 Security Best Practices

- ✅ Never commit `.env` files or API keys to git
- ✅ Use IP whitelisting on Aster DEX APIs
- ✅ Disable withdrawal permissions on API keys
- ✅ Set Firebase security rules properly
- ✅ Monitor balances daily
- ✅ Set up alerts for unusual activity

## 🐛 Troubleshooting

### "Firebase permission denied"
- Check Firebase rules allow public reads
- Verify service account credentials

### "Aster API signature invalid"
- Double-check API key and secret
- Ensure no extra spaces in environment variables
- Verify timestamp synchronization

### "OpenAI rate limit"
- Reduce trading cycle frequency
- Switch to gpt-4o-mini if using gpt-4

### Frontend not connecting
- Check Firebase config in `.env`
- Verify Firebase Realtime Database is enabled
- Check browser console for errors

## 📊 Monitoring

### What to Watch

- **Firebase Console**: Real-time data flow
- **Railway Logs**: Backend activity and errors
- **Aster DEX**: Actual positions and balances
- **OpenAI Usage**: API costs

### Healthy System Indicators

- Trading cycles run every 5 minutes
- Market data updates every 30 seconds
- P&L updates every minute
- No error spam in logs

## 🎯 Next Steps

Once everything works:

1. **Customize AI personas** - Edit `server/src/ai-traders.js`
2. **Adjust trading frequency** - Change cron schedule in `server/src/server.js`
3. **Add more markets** - Modify symbol filtering
4. **Enhance UI** - Add more charts, stats, etc.
5. **Share your arena!** - Tweet your live dashboard

---

Need help? Check the main [README.md](README.md) or create an issue!
