import {
  saveColleague,
  getAllColleagues,
  getColleagueByName,
  deleteColleague,
} from "../../lib/db";

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const bodyText = await response.text();
  return {
    error: "Non-JSON response from server",
    details:
      bodyText && bodyText.trim().startsWith("<")
        ? "Server returned an HTML error page. Check deployment/environment config."
        : bodyText || "Unknown server response",
  };
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { name, faceDescriptor } = req.body || {};

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Colleague name is required" });
      }

      if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
        return res.status(400).json({ error: "Face descriptor is required" });
      }

      const colleague = await saveColleague(name, faceDescriptor);

      return res.status(200).json({
        success: true,
        colleague,
      });
    } catch (error) {
      console.error("❌ Error saving colleague:", error.message);
      return res.status(500).json({
        error: "Failed to save colleague",
        details: error.message,
      });
    }
  }

  if (req.method === "GET") {
    try {
      const { name } = req.query;

      if (name) {
        const colleague = await getColleagueByName(name);
        return res.status(200).json({ colleague });
      }

      const colleagues = await getAllColleagues();
      return res.status(200).json({ colleagues });
    } catch (error) {
      console.error("❌ Error fetching colleagues:", error.message);
      return res.status(500).json({
        error: "Failed to fetch colleagues",
        details: error.message,
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { name } = req.body || {};

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Colleague name is required" });
      }

      await deleteColleague(name);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.error("❌ Error deleting colleague:", error.message);
      return res.status(500).json({
        error: "Failed to delete colleague",
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
