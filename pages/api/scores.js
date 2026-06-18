import { saveScore, getLeaderboard } from "../../lib/db";

export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { teamName, timeTaken, errors } = req.body;

      if (
        !teamName ||
        typeof timeTaken !== "number" ||
        typeof errors !== "number"
      ) {
        return res
          .status(400)
          .json({ error: "Missing or invalid required fields" });
      }

      const result = saveScore(teamName, timeTaken, errors);
      const leaderboard = getLeaderboard();

      res.status(201).json({
        success: true,
        scoreId: result.lastInsertRowid,
        leaderboard,
      });
    } catch (error) {
      console.error("Error saving score:", error);
      res.status(500).json({ error: "Failed to save score" });
    }
  } else if (req.method === "GET") {
    try {
      const leaderboard = getLeaderboard();
      res.status(200).json({ leaderboard });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
