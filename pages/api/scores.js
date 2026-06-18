import { saveScore, getLeaderboard } from "../../lib/db";

export default async function handler(req, res) {
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

      await saveScore(teamName, timeTaken, errors);
      const leaderboard = await getLeaderboard();

      res.status(201).json({
        success: true,
        leaderboard,
      });
    } catch (error) {
      console.error("❌ Error saving score:", error.message);

      if (error.message.includes("MONGODB_URI")) {
        return res.status(500).json({
          error: "Database not configured",
          message:
            "MONGODB_URI environment variable is missing. Add it to Vercel project settings.",
          details: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to save score",
        details: error.message,
      });
    }
  } else if (req.method === "GET") {
    try {
      const leaderboard = await getLeaderboard();
      res.status(200).json({ leaderboard });
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error.message);

      if (error.message.includes("MONGODB_URI")) {
        return res.status(500).json({
          error: "Database not configured",
          message:
            "MONGODB_URI environment variable is missing. Add it to Vercel project settings.",
          details: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to fetch leaderboard",
        details: error.message,
      });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
