import {
  getLeaderboard,
  getAllScores,
  getScoresByTeam,
  getTeamBySession,
} from "../../lib/db";
import { getSessionFromRequest } from "../../lib/teamSession";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { type = "leaderboard" } = req.query;

      if (type === "all") {
        const scores = await getAllScores();
        return res.status(200).json({ scores });
      }

      if (type === "team") {
        const session = getSessionFromRequest(req);
        if (!session) {
          return res.status(401).json({
            error: "Unauthorized",
            details: "Missing or invalid team session",
          });
        }

        const team = await getTeamBySession(session.teamId, session.teamKey);
        if (!team) {
          return res.status(401).json({
            error: "Unauthorized",
            details: "Team session is invalid or expired",
          });
        }

        const scores = await getScoresByTeam(team._id);
        return res.status(200).json({ scores });
      }

      // Default: return leaderboard
      const leaderboard = await getLeaderboard();
      res.status(200).json({ leaderboard });
    } catch (error) {
      console.error("❌ Error fetching scores:", error.message);

      if (error.message.includes("MONGODB_URI")) {
        return res.status(500).json({
          error: "Database not configured",
          message:
            "MONGODB_URI environment variable is missing. Add it to Vercel project settings.",
          details: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to fetch scores",
        details: error.message,
      });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
