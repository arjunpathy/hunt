# Quick Setup for Vercel Deployment

## The Problem (Fixed ✅)

Your MongoDB integration wasn't working on Vercel because `better-sqlite3` (native module) can't compile on Vercel's serverless environment. We've switched to **MongoDB**, which works perfectly!

## What Changed

- ❌ Removed: `better-sqlite3` (local SQLite)
- ✅ Added: `mongoose` (MongoDB)
- All API endpoints remain the same
- Admin dashboard works the same way

## Quick Setup (3 Steps)

### Step 1: Set Up MongoDB Atlas (FREE)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up → Create project → Create cluster (M0 free)
3. Create username/password
4. Network Access: Add `0.0.0.0/0` (allows Vercel)
5. Copy connection string

### Step 2: Update Vercel Environment Variables

1. Go to your Vercel project settings
2. Add environment variable:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hunt?retryWrites=true&w=majority
   ```
3. Redeploy

### Step 3: Test Locally (Optional)

```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your MongoDB connection string

# Test locally
npm run dev
```

## What's Your Connection String?

**Example format:**

```
mongodb+srv://huntuser:MyPassword123@hunt-cluster.mongodb.net/hunt?retryWrites=true&w=majority
```

- Replace `huntuser` with your username
- Replace `MyPassword123` with your password
- Replace `hunt-cluster` with your cluster name

You'll find this in MongoDB Atlas → Cluster → Connect → Connection String

## That's It!

After setting `MONGODB_URI` in Vercel, scores will now:

- ✅ Save to MongoDB
- ✅ Persist across sessions
- ✅ Load on admin dashboard
- ✅ Export to CSV

## Need Help?

### "Failed to load scores" after redeployment?

1. Check Vercel logs (Deployment → Logs)
2. Verify `MONGODB_URI` is set in project settings
3. Ensure MongoDB cluster is running and accessible

### Still seeing localStorage data?

Browser cache might be old. Clear browser storage or use incognito.

### Want to test locally first?

1. Set up `.env.local` with your MongoDB connection
2. Run `npm run dev`
3. Play the game and check `/scores-management`

## Files Changed

- `lib/db.js` - MongoDB implementation
- `pages/api/scores.js` - Updated for async MongoDB
- `pages/api/leaderboard.js` - Updated for async MongoDB
- `.env.local.example` - NEW: Template for MongoDB URI
- `DATABASE_SETUP.md` - NEW: Complete setup guide

That's it! Your Vercel deployment should work now. 🎉
