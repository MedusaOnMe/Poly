# 🔑 API Keys & Environment Variables - Quick Reference

## 📝 What You Need

### 1. Firebase (Free)
**What it's for:** Real-time database for storing AI trades, balances, positions

**Steps:**
1. Go to https://console.firebase.google.com
2. Click "Add Project"
3. Name it: "aster-arena" (or whatever)
4. Disable Google Analytics (not needed)
5. Click "Create Project"

**Enable Realtime Database:**
1. In sidebar: Build → Realtime Database
2. Click "Create Database"
3. Choose location (closest to you)
4. Start in "Test Mode" (we'll secure later)
5. Click "Enable"

**Get Frontend Config (7 variables):**
1. Project Settings (gear icon) → General
2. Scroll to "Your apps"
3. Click Web icon `</>`
4. Register app: "aster-arena-client"
5. Copy the config values:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=aster-arena.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://aster-arena-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=aster-arena
VITE_FIREBASE_STORAGE_BUCKET=aster-arena.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Get Backend Config (4 variables):**
1. Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Extract these values:

```
FIREBASE_PROJECT_ID=aster-arena
FIREBASE_DATABASE_URL=https://aster-arena-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aster-arena.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

---

### 2. OpenAI API (Paid - ~$15-60/month)
**What it's for:** Powers the 5 AI traders' decision-making

**Steps:**
1. Go to https://platform.openai.com
2. Sign up or log in
3. Go to API Keys
4. Click "Create new secret key"
5. Name it: "aster-arena"
6. Copy the key (starts with `sk-proj-...`)

```
OPENAI_API_KEY=sk-proj-xxxxx...
```

**Important:**
- Add payment method: Settings → Billing
- Add $10-20 credits to start
- Using gpt-4o-mini (cheapest) = ~$0.10 per trading cycle
- 288 cycles/day = ~$30/day if running 24/7
- Reduce to every 10-15 min to lower costs

---

### 3. Aster DEX API Keys (Free to create, need $500 each)
**What it's for:** Execute real trades on Aster DEX perpetual futures

**You need 5 wallets (one per AI):**

**For EACH wallet:**
1. Go to https://www.asterdex.com
2. Create account / Connect wallet
3. Fund with $500 USDT
4. Go to API Management
5. Click "Create API"
6. Name it: "GPT Trader" (or Claude, DeepSeek, etc.)
7. **IMPORTANT:** Disable withdrawal permission!
8. Copy API Key and Secret Key (only shown once!)

**Repeat 5 times for:**
- Wallet 1: GPT
- Wallet 2: Claude
- Wallet 3: DeepSeek
- Wallet 4: Grok
- Wallet 5: Gemini

```
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

---

## 📄 Create .env Files

### Frontend: `client/.env`

Create this file with your Firebase frontend config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Backend: `server/.env`

Create this file with ALL your keys:

```env
# Server
PORT=3000

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Firebase Backend
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"

# Aster DEX - Wallet 1 (GPT)
ASTER_API_KEY_1=your_api_key_1
ASTER_SECRET_KEY_1=your_secret_key_1

# Aster DEX - Wallet 2 (Claude)
ASTER_API_KEY_2=your_api_key_2
ASTER_SECRET_KEY_2=your_secret_key_2

# Aster DEX - Wallet 3 (DeepSeek)
ASTER_API_KEY_3=your_api_key_3
ASTER_SECRET_KEY_3=your_secret_key_3

# Aster DEX - Wallet 4 (Grok)
ASTER_API_KEY_4=your_api_key_4
ASTER_SECRET_KEY_4=your_secret_key_4

# Aster DEX - Wallet 5 (Gemini)
ASTER_API_KEY_5=your_api_key_5
ASTER_SECRET_KEY_5=your_secret_key_5
```

---

## ✅ Quick Checklist

- [ ] Firebase project created
- [ ] Realtime Database enabled
- [ ] Firebase frontend config copied to `client/.env`
- [ ] Firebase service account key downloaded
- [ ] Firebase backend config added to `server/.env`
- [ ] OpenAI API key created
- [ ] OpenAI billing set up
- [ ] 5 Aster DEX wallets created
- [ ] Each wallet funded with $500 USDT
- [ ] 5 API key pairs created (withdrawal disabled!)
- [ ] All 10 Aster keys added to `server/.env`

---

## 💰 Total Cost

**One-time:**
- 5 × $500 USDT = $2,500 (in Aster wallets - your money, you trade with it)

**Monthly:**
- Firebase: $0 (free tier)
- Railway: $5/month
- OpenAI: $15-60/month (depends on trading frequency)

**Total recurring: ~$20-65/month**

---

## 🚀 After You Have All Keys

1. Add them to the `.env` files
2. Start backend: `cd server && npm run dev`
3. Start frontend: `cd client && npm run dev`
4. Open http://localhost:5173
5. Watch the magic! ✨

---

## 🔒 Security Notes

- Never commit `.env` files to git (already in .gitignore)
- Aster API keys should have withdrawal DISABLED
- Keep your Firebase private key secret
- Use IP whitelisting on Aster if possible

---

## 🆘 Need Help?

- Firebase issues: Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Aster DEX setup: https://docs.asterdex.com
- OpenAI billing: https://platform.openai.com/settings/organization/billing

---

**Total: 21 environment variables to set up!**

7 for frontend + 14 for backend = Full power! 🔥
