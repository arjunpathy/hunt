import { getLeaderboard, getAllScores, getScoresByTeam } from "../../lib/db";

export default function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { type = "leaderboard", teamName } = req.query;

      if (type === "all") {
        const scores = getAllScores();
        return res.status(200).json({ scores });
      }

      if (type === "team" && teamName) {
        const scores = getScoresByTeam(teamName);
        return res.status(200).json({ scores });
      }

      // Default: return leaderboard
      const leaderboard = getLeaderboard();
      res.status(200).json({ leaderboard });
    } catch (error) {
      console.error("Error fetching scores:", error);
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
