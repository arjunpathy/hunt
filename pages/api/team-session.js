import { ensureTeam } from "../../lib/db";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "../../lib/teamSession";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { teamName, teamKey = "" } = req.body || {};

      if (!teamName || typeof teamName !== "string") {
        return res.status(400).json({ error: "Team name is required" });
      }

      const {
        team,
        teamKey: issuedKey,
        isNew,
      } = await ensureTeam(teamName, teamKey);

      const token = createSessionToken({
        teamId: team._id.toString(),
        teamKey: issuedKey,
      });

      setSessionCookie(res, token);

      return res.status(200).json({
        success: true,
        teamName: team.teamName,
        teamKey: isNew ? issuedKey : null,
        claimed: isNew,
      });
    } catch (error) {
      if (error.code === "TEAM_CLAIMED") {
        return res.status(409).json({
          error: "Team already claimed",
          details: error.message,
        });
      }

      if (error.code === "INVALID_TEAM_NAME") {
        return res.status(400).json({
          error: "Invalid team name",
          details: error.message,
        });
      }

      if (error.code === "MONGO_AUTH_FAILED") {
        return res.status(500).json({
          error: "Database authentication failed",
          details:
            "MongoDB username/password in MONGODB_URI is invalid. Update credentials in your environment settings.",
        });
      }

      return res.status(500).json({
        error: "Failed to establish team session",
        details: error.message,
      });
    }
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
