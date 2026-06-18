import Database from "better-sqlite3";
import path from "path";

let db = null;

export function getDB() {
  if (!db) {
    const dbPath = path.join(process.cwd(), "hunt.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teamName TEXT NOT NULL,
        timeTaken INTEGER NOT NULL,
        errors INTEGER NOT NULL,
        completedAt INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_timeTaken ON scores(timeTaken);
      CREATE INDEX IF NOT EXISTS idx_completedAt ON scores(completedAt);
    `);
  }
  return db;
}

export function saveScore(teamName, timeTaken, errors) {
  const database = getDB();
  const stmt = database.prepare(`
    INSERT INTO scores (teamName, timeTaken, errors, completedAt)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(teamName, timeTaken, errors, Date.now());
  return result;
}

export function getLeaderboard(limit = 50) {
  const database = getDB();
  const stmt = database.prepare(`
    SELECT * FROM scores
    ORDER BY timeTaken ASC, errors ASC
    LIMIT ?
  `);

  return stmt.all(limit);
}

export function getScoresByTeam(teamName) {
  const database = getDB();
  const stmt = database.prepare(`
    SELECT * FROM scores
    WHERE teamName = ?
    ORDER BY completedAt DESC
  `);

  return stmt.all(teamName);
}

export function getAllScores() {
  const database = getDB();
  const stmt = database.prepare(`
    SELECT * FROM scores
    ORDER BY createdAt DESC
  `);

  return stmt.all();
}
