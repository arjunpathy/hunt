# Database Functionality - Hunt Score Management

Your scavenger hunt application now includes persistent database functionality for tracking scores!

## What's New

### Database System

- **Database**: SQLite (stored in `hunt.db`)
- **No setup required**: Database is automatically created on first run
- **Zero configuration**: Uses file-based SQLite for simplicity

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

The application automatically creates a `scores` table with:

- `id`: Auto-incrementing primary key
- `teamName`: Team name (text)
- `timeTaken`: Time in seconds (integer)
- `errors`: Number of errors made (integer)
- `completedAt`: Timestamp when game was completed (integer)
- `createdAt`: Timestamp when record was created (datetime)

Indexes are automatically created on `timeTaken` and `completedAt` for fast queries.

## File Structure

```
lib/
├── db.js                    # Database connection and queries
items.js                     # (unchanged) Item definitions

pages/
├── api/
│   ├── scores.js           # POST/GET score endpoints
│   └── leaderboard.js      # Advanced leaderboard queries
├── index.js                # (updated) Uses API instead of localStorage
├── admin.js                # (unchanged)
├── _app.js                 # (unchanged)
└── scores-management.js    # NEW: Admin dashboard

hunt.db                      # Created automatically on first run
```

## Migration from localStorage

All existing localStorage data can be imported. The application now:

- Automatically fetches scores from database on startup
- Saves scores to database instead of localStorage
- Maintains full leaderboard functionality

## Setup & Running

```bash
# Install dependencies (if not already done)
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The database file (`hunt.db`) will be created automatically in the project root on first score submission.

## Security Notes

1. **Admin Password**: Change the default password in `pages/scores-management.js`
2. **Production**: Consider using environment variables for sensitive data
3. **Backup**: Regularly backup the `hunt.db` file for important events

## Troubleshooting

### Database file not created

The database file is created automatically when the first score is saved. It won't exist until that happens.

### Can't access scores-management

- Check the URL: `/scores-management`
- Default password is: `admin123`
- Edit the password in `pages/scores-management.js` if needed

### API errors

- Ensure the development server is running
- Check browser console for detailed error messages
- The database file should be readable/writable in the project directory

## Future Enhancements

Possible additions:

- Authentication system for admin panel
- Backup/restore functionality
- Statistics and analytics dashboard
- Team-specific leaderboards
- Score filtering and sorting options
