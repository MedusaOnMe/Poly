# ⚡ Quick Start - AI Trading Arena

Get up and running in 15 minutes!

## 🎯 What You Need

1. **5 Aster DEX API keys** (with $500 each)
2. **Firebase project** (free tier)
3. **OpenAI API key**

## 🚀 Fast Setup

### 1. Clone & Install (2 min)

```bash
cd "Aster Arena"

# Install frontend
cd client
npm install

# Install backend
cd ../server
npm install
```

### 2. Configure Frontend (3 min)

Create `client/.env`:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
VITE_FIREBASE_APP_ID=1:123456:web:abc123
```

Get these from: Firebase Console → Project Settings → General → Your apps → Web

### 3. Configure Backend (5 min)

Create `server/.env`:

```env
PORT=3000
OPENAI_API_KEY=sk-proj-xxxxx

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_CLIENT_EMAIL=xxx@yyy.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# Aster API Keys (one per AI)
ASTER_API_KEY_1=key1
ASTER_SECRET_KEY_1=secret1
ASTER_API_KEY_2=key2
ASTER_SECRET_KEY_2=secret2
ASTER_API_KEY_3=key3
ASTER_SECRET_KEY_3=secret3
ASTER_API_KEY_4=key4
ASTER_SECRET_KEY_4=secret4
ASTER_API_KEY_5=key5
ASTER_SECRET_KEY_5=secret5
```

Get Firebase private key from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

### 4. Run Locally (5 min)

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Open http://localhost:5173 🎉

### 5. Test It

```bash
# Trigger a test trading cycle
curl -X POST http://localhost:3000/api/trigger-cycle
```

Watch the backend logs - you should see AIs making decisions!

## 🚂 Deploy to Railway (Optional)

### Backend

1. Push to GitHub
2. Railway → New Project → Deploy from GitHub
3. Root: `/server`
4. Add all env vars from `server/.env`
5. Deploy

### Frontend

1. Same Railway project → New Service
2. Root: `/client`
3. Add all env vars from `client/.env`
4. Deploy

## 🆘 Quick Troubleshooting

**"Firebase permission denied"**
→ Enable Realtime Database, set rules to public read

**"Aster API error"**
→ Check API keys, ensure no spaces in .env

**"Module not found"**
→ Run `npm install` in both client and server

**"OpenAI error"**
→ Check API key, verify billing enabled

## 📖 Need More Help?

- Detailed guide: [SETUP.md](SETUP.md)
- Project overview: [README.md](README.md)
- Architecture: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

## ✅ Verification Checklist

- [ ] Frontend shows "CONNECTED"
- [ ] Firebase console has data in Realtime Database
- [ ] Backend logs show successful initialization
- [ ] Market data appears in frontend ticker
- [ ] Manual trigger works (curl command)
- [ ] No errors in browser console

You're all set! The AIs will start trading automatically every 5 minutes. 🤖💰

---

**Pro tip**: Keep both terminal windows open to watch the action in real-time!
