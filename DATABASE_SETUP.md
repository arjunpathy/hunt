# Database Functionality - Hunt Score Management

Your scavenger hunt application now includes persistent database functionality using **MongoDB**, which works perfectly with Vercel!

## What's New

### Database System

- **Database**: MongoDB (Cloud-based via MongoDB Atlas)
- **Framework**: Mongoose for data modeling
- **Serverless-compatible**: Works on Vercel, Netlify, and other serverless platforms
- **Free tier available**: MongoDB Atlas free tier is generous

### Setup Instructions

#### 1. Create a MongoDB Atlas Cluster (FREE)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Create a new project
4. Create a cluster (free tier M0)
5. Set up a username and password
6. Add your IP address to the network access whitelist (or allow 0.0.0.0/0 for development)
7. Copy the connection string

#### 2. Configure Environment Variable

1. Copy `.env.local.example` to `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hunt?retryWrites=true&w=majority
   ```

#### 3. Deploy to Vercel

1. Push your code to GitHub
2. Import your repo in [Vercel](https://vercel.com)
3. Add the `MONGODB_URI` environment variable in Vercel project settings
4. Deploy!

### New API Endpoints

#### POST `/api/scores`

Save a new score to the database.

```javascript
fetch("/api/scores", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    teamName: "Team A",
    timeTaken: 125,
    errors: 3,
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data.leaderboard));
```

#### GET `/api/scores`

Retrieve the leaderboard (top 50 scores).

```javascript
fetch("/api/scores")
  .then((res) => res.json())
  .then((data) => console.log(data.leaderboard));
```

#### GET `/api/leaderboard`

Advanced leaderboard queries.

```javascript
// Get leaderboard (default)
GET /api/leaderboard

// Get all scores
GET /api/leaderboard?type=all

// Get scores for specific team
GET /api/leaderboard?type=team&teamName=TeamName
```

### New Pages

#### `/scores-management`

A password-protected admin dashboard to:

- View all recorded scores
- Export scores as CSV
- Refresh data
- View team performance history

**Default password**: `admin123` (Change this in `pages/scores-management.js`)

## Database Schema

MongoDB collection structure:

```javascript
{
  _id: ObjectId,
  teamName: String,          // Indexed
  timeTaken: Number,         // Indexed (in seconds)
  errors: Number,
  completedAt: Number,       // Unix timestamp, Indexed
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

## File Structure

```
lib/
├── db.js                    # MongoDB connection and queries
items.js                     # (unchanged) Item definitions

pages/
├── api/
│   ├── scores.js           # POST/GET score endpoints
│   └── leaderboard.js      # Advanced leaderboard queries
├── index.js                # (updated) Uses API instead of localStorage
├── admin.js                # (unchanged)
├── _app.js                 # (unchanged)
└── scores-management.js    # NEW: Admin dashboard

.env.local.example          # Environment template
.env.local                  # Add your MONGODB_URI here
```

## Setup & Running

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your MongoDB connection string

# Run development server
npm run dev
```

### Production (Vercel)

1. Add `MONGODB_URI` to Vercel environment variables
2. Push to main branch
3. Vercel automatically deploys

## Troubleshooting

### "Failed to load scores" on Vercel

**Cause**: Missing or invalid `MONGODB_URI` environment variable

**Solution**:

1. Check that `MONGODB_URI` is set in Vercel project settings
2. Verify the connection string includes username:password
3. Ensure IP is whitelisted in MongoDB Atlas (use 0.0.0.0/0 for Vercel)
4. Check Vercel function logs for detailed errors

### "Cannot find module 'mongoose'"

**Solution**: Run `npm install` and rebuild

### Scores not persisting

**Cause**: Database connection issue

**Solution**:

1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas cluster status
3. Confirm network access rules allow Vercel IPs

### Admin panel says "Incorrect password"

- Default password is: `admin123`
- Edit password in `pages/scores-management.js` line 10

## Security Notes

1. **Change admin password**: Update line 10 in `scores-management.js`
2. **IP Whitelisting**: For production, restrict MongoDB access to specific IPs if possible
3. **Connection string**: Never commit `.env.local` to git (already in .gitignore)
4. **Rate limiting**: Consider adding rate limiting for API endpoints

## Free Tier Limits (MongoDB Atlas)

- Storage: 512 MB
- Connections: 500 concurrent
- Sufficient for most scavenger hunts

For larger deployments, upgrade to paid tier.

## Migration from SQLite

If you had the previous SQLite version:

1. Scores are not automatically migrated (they were stored locally)
2. Fresh start with new MongoDB database
3. All future scores are persisted in MongoDB
