# 🔧 Troubleshooting Guide

Common issues and their solutions.

## Frontend Issues

### Tailwind CSS / PostCSS Errors

**Error**: `It looks like you're trying to use 'tailwindcss' directly as a PostCSS plugin`

**Solution**: We're using Tailwind v4 which requires the new PostCSS plugin:

```bash
cd client
npm install -D @tailwindcss/postcss
```

The `postcss.config.js` should look like this:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

And in `src/index.css`, use the new import syntax:
```css
@import "tailwindcss";
```

**Error**: `Cannot apply unknown utility class 'border-dark-border'` or similar custom color errors

**Solution**: In Tailwind v4, custom utilities are defined directly in CSS using `@layer utilities`. All custom color classes are already defined in `src/index.css`. If you see this error:

1. Make sure `src/index.css` has the `@layer utilities` section with all custom colors
2. Restart the dev server (`npm run dev`)
3. Clear browser cache if needed

The custom colors are:
- `bg-dark-bg`, `bg-dark-card`, `bg-dark-bg/50`, `bg-dark-card/50`
- `border-dark-border`, `border-dark-border/50`
- `text-accent-blue`, `bg-accent-blue`, `border-accent-blue`
- `text-profit-green`, `bg-profit-green/20`, `text-profit-green/70`
- `text-loss-red`, `bg-loss-red/20`, `text-loss-red/70`

### Firebase Connection Issues

**Error**: "Firebase permission denied"

**Solutions**:
1. Check Firebase Realtime Database is enabled
2. Verify database rules allow public reads:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
3. Check all `VITE_FIREBASE_*` env variables are set correctly
4. Ensure `.env` file is in `/client` directory

**Error**: "Firebase config not found"

**Solution**:
1. Copy `.env.example` to `.env`
2. Fill in all Firebase values from Firebase Console
3. Restart the dev server (`npm run dev`)

### Module Not Found Errors

**Error**: `Cannot find module 'firebase/database'`

**Solution**:
```bash
cd client
npm install firebase
```

**Error**: `Cannot find module 'chart.js'`

**Solution**:
```bash
cd client
npm install chart.js react-chartjs-2
```

### Blank Page / White Screen

**Possible causes**:
1. Check browser console for JavaScript errors
2. Verify Firebase is configured correctly
3. Check that backend is running and accessible

**Debug steps**:
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check browser console (F12)
# Look for errors in red

# Verify env variables are loaded
console.log(import.meta.env)
```

## Backend Issues

### Module Errors

**Error**: `Cannot find module 'openai'`

**Solution**:
```bash
cd server
npm install
```

**Error**: `Error [ERR_MODULE_NOT_FOUND]`

**Solution**: Verify `package.json` has `"type": "module"`:
```json
{
  "type": "module",
  ...
}
```

### Firebase Admin Issues

**Error**: "Firebase credential error"

**Solutions**:
1. **Option A - Service Account File**:
   - Download `firebase-service-account.json` from Firebase Console
   - Place in `/server` directory
   - Add to `.gitignore`

2. **Option B - Environment Variables**:
   - Set in `.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   - **Important**: Keep the `\n` characters in the private key!

**Error**: "Failed to parse private key"

**Solution**: The private key must include literal `\n` characters:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0...\n-----END PRIVATE KEY-----\n"
```

### Aster DEX API Issues

**Error**: "Signature verification failed"

**Solutions**:
1. Verify API key and secret are correct (no extra spaces)
2. Check timestamp synchronization (server time should be accurate)
3. Test with a simple request:
   ```bash
   curl https://fapi.asterdex.com/fapi/v1/exchangeInfo
   ```

**Error**: "API key does not exist"

**Solution**:
1. Log into Aster DEX
2. Go to API Management
3. Verify the API key is active
4. Double-check you copied the correct key

**Error**: "IP not whitelisted"

**Solution**:
1. In Aster DEX API settings, check IP whitelist
2. Either remove IP restriction or add your server's IP
3. For Railway, you may need to disable IP whitelisting (Railway IPs can change)

### OpenAI API Issues

**Error**: "Incorrect API key provided"

**Solution**:
1. Verify `OPENAI_API_KEY` in `.env`
2. Key should start with `sk-proj-` or `sk-`
3. Generate new key at https://platform.openai.com/api-keys

**Error**: "Rate limit exceeded"

**Solution**:
1. Check OpenAI usage dashboard
2. Reduce trading cycle frequency (edit cron in `server.js`)
3. Upgrade OpenAI plan if needed

**Error**: "Insufficient quota"

**Solution**:
1. Go to https://platform.openai.com/settings/organization/billing
2. Add payment method
3. Add credits to account

### Trading Engine Issues

**Error**: "No market data available"

**Solution**:
1. Check Aster DEX API is accessible
2. Verify `updateMarketDataJob()` is running
3. Check backend logs for API errors

**Error**: "AIs not making trades"

**Solutions**:
1. Check OpenAI API is working (verify API key)
2. Look at backend logs for decision errors
3. Manually trigger cycle:
   ```bash
   curl -X POST http://localhost:3000/api/trigger-cycle
   ```
4. Check Firebase for `last_decision` field updates

## Deployment Issues (Railway)

### Build Failures

**Error**: "Module not found during build"

**Solution**:
1. Check `package.json` has all dependencies
2. Verify root directory is set correctly (`/client` or `/server`)
3. Check Railway build logs for specific error

**Error**: "Build exceeded time limit"

**Solution**:
1. Check for large dependencies
2. Verify npm install isn't hanging
3. Try deploying again (sometimes transient)

### Environment Variables

**Error**: "Environment variable not set"

**Solution**:
1. Railway dashboard → Variables
2. Add all variables from `.env.example`
3. Redeploy after adding variables

**Important**: In Railway, multiline env variables (like `FIREBASE_PRIVATE_KEY`) must keep the `\n` characters as literal `\n`.

### Runtime Errors

**Error**: "Port already in use"

**Solution**: Railway sets `PORT` env variable automatically. Make sure your code uses:
```js
const PORT = process.env.PORT || 3000
```

**Error**: "Application crashed on startup"

**Solution**:
1. Check Railway logs for specific error
2. Verify all env variables are set
3. Test locally first with same env variables

## Database Issues

### Firebase Data Not Appearing

**Checklist**:
- [ ] Realtime Database is enabled (not Firestore)
- [ ] Database URL is correct in `.env`
- [ ] Security rules allow writes
- [ ] Backend successfully initialized
- [ ] Check Firebase Console → Realtime Database tab

**Debug**:
1. Check backend logs - should see "✅ AI traders initialized"
2. Open Firebase Console → Realtime Database
3. Should see `ai_traders`, `market_data`, etc.

### Data Not Syncing to Frontend

**Solutions**:
1. Check browser console for Firebase errors
2. Verify frontend Firebase config matches backend
3. Test Firebase connection:
   ```js
   import { ref, onValue } from 'firebase/database'
   import { database } from './firebase'

   const testRef = ref(database, 'ai_traders')
   onValue(testRef, (snapshot) => {
     console.log('Data:', snapshot.val())
   })
   ```

## Performance Issues

### High OpenAI Costs

**Solutions**:
1. Already using `gpt-4o-mini` (cheapest option)
2. Reduce trading cycle frequency:
   ```js
   // In server.js, change from 5 min to 10 min
   cron.schedule('*/10 * * * *', runAllAITraders)
   ```
3. Reduce prompt length in `ai-traders.js`
4. Limit market data sent to AI

### Slow Frontend Updates

**Solutions**:
1. Firebase should be near-instant
2. Check network tab in browser DevTools
3. Verify Firebase listeners are set up correctly
4. Check for console errors

### High Memory Usage

**Solutions**:
1. Check for memory leaks (use Chrome DevTools)
2. Verify Firebase listeners are cleaned up:
   ```js
   useEffect(() => {
     const unsubscribe = onValue(...)
     return () => unsubscribe() // Important!
   }, [])
   ```

## Security Issues

### API Keys Exposed

**If you accidentally committed API keys**:
1. **IMMEDIATELY** rotate all keys:
   - Aster DEX: Delete and create new API keys
   - OpenAI: Revoke and create new key
   - Firebase: Regenerate service account
2. Update `.env` with new keys
3. Add `.env` to `.gitignore`
4. Force push to remove from git history (or make repo private)

### Unauthorized Trades

**If you see unexpected trades**:
1. Check Railway logs for unauthorized access
2. Verify Aster API keys are correct
3. Review Firebase security rules
4. Check IP whitelist on Aster DEX
5. Consider disabling API keys temporarily

## Getting Help

### Enable Debug Logging

**Frontend**:
```js
// In App.jsx
console.log('AI Data:', aiData)
console.log('Positions:', positions)
console.log('Trades:', trades)
```

**Backend**:
```js
// In server.js or trading-engine.js
console.log('Decision:', decision)
console.log('Market data:', marketData)
console.log('Balance:', balance)
```

### Check All Services

```bash
# Backend health
curl http://localhost:3000/health

# Get traders
curl http://localhost:3000/api/traders

# Get positions
curl http://localhost:3000/api/positions

# Trigger test cycle
curl -X POST http://localhost:3000/api/trigger-cycle
```

### Logs to Check

1. **Railway** (Backend):
   - Deployment logs
   - Runtime logs
   - Check for repeated errors

2. **Vercel** (Frontend):
   - Build logs
   - Function logs (if using serverless)

3. **Firebase**:
   - Usage tab (reads/writes)
   - Should be well under limits

4. **Browser**:
   - Console (F12 → Console tab)
   - Network tab (check failed requests)

### Still Stuck?

1. Check the main [README.md](README.md)
2. Review [SETUP.md](SETUP.md)
3. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
4. Create a GitHub issue with:
   - Error message
   - Relevant logs
   - Steps to reproduce

---

**Pro tip**: Most issues are caused by environment variables. Double-check all your `.env` files first!
