import React, { useState, useEffect } from "react";
import { Download, Trash2, Eye, EyeOff } from "lucide-react";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ScoresManagement() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const ADMIN_PASSWORD = "admin123"; // Change this to a secure password

  useEffect(() => {
    if (isAuthenticated) {
      fetchScores();
    }
  }, [isAuthenticated]);

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leaderboard?type=all");
      if (!response.ok) throw new Error("Failed to fetch scores");
      const data = await response.json();
      setScores(data.scores || []);
    } catch (error) {
      console.error("Error fetching scores:", error);
      alert("Failed to load scores");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
    } else {
      alert("Incorrect password");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setScores([]);
  };

  const exportToCSV = () => {
    if (scores.length === 0) {
      alert("No scores to export");
      return;
    }

    const headers = [
      "Team Name",
      "Time (seconds)",
      "Errors",
      "Completed At",
      "Created At",
    ];
    const rows = scores.map((score) => [
      score.teamName,
      score.timeTaken,
      score.errors,
      new Date(score.completedAt).toLocaleString(),
      new Date(score.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `hunt-scores-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md p-8 bg-slate-800 rounded-lg"
        >
          <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-200 text-sm mb-4"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold transition"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Hunt Scores Management</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={fetchScores}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition"
          >
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400">Loading scores...</div>
        ) : scores.length === 0 ? (
          <div className="text-center text-slate-400">No scores yet</div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-slate-700">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-sm">
                  <th className="px-4 py-3 text-left">Team Name</th>
                  <th className="px-4 py-3 text-right">Time</th>
                  <th className="px-4 py-3 text-right">Errors</th>
                  <th className="px-4 py-3 text-left">Completed At</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr
                    key={index}
                    className="border-t border-slate-700 hover:bg-slate-800/50 transition"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {score.teamName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">
                      {formatTime(score.timeTaken)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {score.errors}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {new Date(score.completedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {new Date(score.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 p-4 bg-slate-800 rounded-lg text-slate-400 text-sm">
          <p>Total scores: {scores.length}</p>
        </div>
      </div>
    </div>
  );
}
