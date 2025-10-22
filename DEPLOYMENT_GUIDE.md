# 🚀 Deployment Guide - Railway & Production

Complete guide for deploying AI Trading Arena to production.

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- ✅ All 5 Aster DEX wallets funded with $500 USDT each
- ✅ API keys created for each wallet (read/write enabled, withdrawal disabled)
- ✅ Firebase Realtime Database set up and tested locally
- ✅ OpenAI API key with billing enabled
- ✅ Code tested locally and working
- ✅ Git repository created (GitHub recommended)
- ✅ Railway account (or alternative hosting)

## 🔥 Firebase Production Setup

### Security Rules

Update your Firebase Realtime Database rules:

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    "ai_traders": {
      ".write": "auth.uid === 'your-server-uid'"
    },
    "positions": {
      ".write": "auth.uid === 'your-server-uid'"
    },
    "trades": {
      ".write": "auth.uid === 'your-server-uid'"
    },
    "market_data": {
      ".write": "auth.uid === 'your-server-uid'"
    }
  }
}
```

**For simplicity in this project**: Keep `.write: true` temporarily, but restrict by IP if possible.

### Get Production Credentials

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Extract these values for Railway:
   - `project_id`
   - `client_email`
   - `private_key` (keep the `\n` characters!)
   - Copy `databaseURL` from Firebase config

## 🚂 Railway Backend Deployment

### Step 1: Prepare Repository

```bash
# Ensure .gitignore is set up (already done)
git init
git add .
git commit -m "Initial commit - AI Trading Arena"

# Push to GitHub
git remote add origin https://github.com/yourusername/ai-trading-arena.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Sign up or log in (GitHub auth recommended)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your repository
6. Railway will detect it's a Node.js project

### Step 3: Configure Backend Service

1. **Set Root Directory**:
   - Click on the service
   - Settings → Root Directory → `/server`

2. **Environment Variables**:
   Click "Variables" and add these one by one:

   ```
   NODE_ENV=production
   PORT=3000

   OPENAI_API_KEY=sk-proj-xxxxx

   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN...\n-----END PRIVATE KEY-----\n

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

   **Important**: For `FIREBASE_PRIVATE_KEY`, use the raw value with actual `\n` newlines.

3. **Verify Build Settings**:
   - Build Command: `npm install` (auto-detected)
   - Start Command: `npm start` (from package.json)

4. **Click "Deploy"**

### Step 4: Verify Backend

1. Check the deployment logs - should see:
   ```
   ✅ AI traders initialized
   ✅ Market data updated
   ✅ All systems operational
   ```

2. Get your Railway URL (e.g., `https://your-app.up.railway.app`)

3. Test endpoints:
   ```bash
   curl https://your-app.up.railway.app/health
   curl https://your-app.up.railway.app/api/traders
   ```

## 🌐 Frontend Deployment Options

### Option A: Railway (Simplest)

1. Same Railway project → **"New Service"**
2. Select same GitHub repo
3. **Root Directory**: `/client`
4. **Environment Variables**: Add all `VITE_*` variables
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run preview -- --host 0.0.0.0 --port $PORT`
7. Deploy

### Option B: Vercel (Recommended)

1. Go to [Vercel](https://vercel.com)
2. **Import Project** → Select your GitHub repo
3. **Framework Preset**: Vite
4. **Root Directory**: `client`
5. **Build Command**: `npm run build` (auto-detected)
6. **Output Directory**: `dist` (auto-detected)
7. **Environment Variables**: Add all `VITE_*` variables:
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```
8. **Deploy**

### Option C: Netlify

1. Go to [Netlify](https://netlify.com)
2. **Add new site** → Import from Git
3. **Base directory**: `client`
4. **Build command**: `npm run build`
5. **Publish directory**: `client/dist`
6. **Environment variables**: Add all `VITE_*` variables
7. Deploy

## 🔍 Post-Deployment Verification

### 1. Check Backend Health

```bash
# Health check
curl https://your-backend.up.railway.app/health

# Check traders initialized
curl https://your-backend.up.railway.app/api/traders

# Check market data
curl https://your-backend.up.railway.app/api/market
```

### 2. Check Frontend

1. Open your frontend URL
2. Should see "CONNECTED" status (green dot)
3. Market data ticker should be scrolling
4. No console errors in browser DevTools

### 3. Check Firebase

1. Open Firebase Console → Realtime Database
2. Should see data under:
   - `ai_traders/`
   - `market_data/`
   - Data should be updating

### 4. Trigger Test Cycle

```bash
curl -X POST https://your-backend.up.railway.app/api/trigger-cycle
```

Check Railway logs - should see AIs making decisions!

## 📊 Monitoring Production

### Railway Logs

Watch your backend logs in Railway dashboard:
- ✅ Trading cycles running every 5 min
- ✅ Market data updates every 30s
- ✅ No repeated errors

### Firebase Console

Monitor database writes:
- Usage tab shows read/write operations
- Should stay well within free tier limits

### OpenAI Usage

Check [OpenAI Usage Dashboard](https://platform.openai.com/usage):
- With gpt-4o-mini: ~$0.50-2/day typical
- Alert if costs spike unexpectedly

### Aster DEX

Monitor each wallet:
- Check balances match what's shown in app
- Verify positions are being created/closed
- Review trade history

## 🚨 Common Deployment Issues

### Backend Won't Start

**"Module not found"**
- Check Root Directory is set to `/server`
- Verify `package.json` has all dependencies
- Check Railway build logs

**"Firebase permission denied"**
- Verify all Firebase env variables are correct
- Check `FIREBASE_PRIVATE_KEY` formatting (with `\n`)
- Ensure database rules allow writes

**"Aster API signature invalid"**
- Double-check API keys (no extra spaces!)
- Verify timestamp sync (Railway servers usually fine)

### Frontend Issues

**"Firebase connection failed"**
- Check all `VITE_*` env variables are set
- Verify Firebase config is correct
- Check browser console for specific error

**"CORS errors"**
- Backend should have CORS enabled (already configured)
- Check Railway backend URL is accessible

**Blank page**
- Check Vercel/Railway build logs
- Verify `dist` folder was created
- Check for JS errors in browser console

## 🔐 Security Best Practices

### Production Checklist

- [ ] All API keys in environment variables (never in code)
- [ ] Aster API keys have withdrawal disabled
- [ ] IP whitelisting enabled on Aster (if possible)
- [ ] Firebase security rules properly configured
- [ ] No `.env` files committed to git
- [ ] Railway environment variables marked as "sensitive"
- [ ] OpenAI API rate limits considered

### Recommended Monitoring

1. **Set up alerts** for:
   - Unusual balance changes
   - High error rates in logs
   - OpenAI cost spikes

2. **Daily checks**:
   - Verify all 5 wallets are trading
   - Check Firebase database size
   - Review Railway resource usage

3. **Weekly reviews**:
   - Analyze AI performance
   - Check total P&L across all AIs
   - Review and optimize costs

## 💰 Cost Optimization

### Expected Monthly Costs

- **Railway Backend**: $5-10 (Starter plan)
- **Vercel Frontend**: $0 (Hobby plan)
- **Firebase**: $0 (Free tier sufficient)
- **OpenAI API**: $15-60 (depends on frequency)

**Total**: ~$20-70/month

### Reduce Costs

1. **Trading Frequency**:
   - Change from 5 min to 10 min cycles
   - Edit `server/src/server.js` cron schedule

2. **OpenAI Model**:
   - Already using `gpt-4o-mini` (cheapest)
   - Could reduce prompt length

3. **Infrastructure**:
   - Use Railway free tier with sleep mode
   - Host frontend on free tier (Vercel/Netlify)

## 🎯 Production Optimization

### Performance

- Backend should handle 5 AIs easily
- Firebase real-time sync is very fast
- Frontend updates are instant

### Scaling

If you want to add more AIs:
1. Get more Aster wallets
2. Add more API key env variables
3. Add personas to `ai-traders.js`
4. Restart backend

### Reliability

- Railway auto-restarts on failure
- Firebase is 99.95% uptime SLA
- Set max retries in Railway config

## 📱 Domain Setup (Optional)

### Custom Domain

1. Buy domain (Namecheap, Google Domains, etc.)
2. Point to Vercel/Railway:
   - Vercel: Add domain in project settings
   - Railway: Add custom domain in service settings
3. SSL automatically handled

Example: `ai-arena.yourdomain.com`

## 🎉 Launch Checklist

Final checks before going live:

- [ ] All services deployed and healthy
- [ ] Frontend accessible and showing data
- [ ] Backend logs show successful trading cycles
- [ ] Firebase has live data
- [ ] All 5 AIs initialized with $500 each
- [ ] Test cycle executed successfully
- [ ] No errors in any logs
- [ ] Monitoring set up
- [ ] Costs understood and acceptable
- [ ] Share your live arena! 🚀

---

**Congratulations!** Your AI Trading Arena is now live in production! 🎮💰

Monitor it for the first few hours to ensure everything runs smoothly, then let the AIs battle it out!

For support, check the [README.md](README.md) or [SETUP.md](SETUP.md).
