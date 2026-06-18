import { useEffect, useState } from "react";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ScoresManagement() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScores = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/scores");
        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadScores();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <div className="flex gap-3">
            <a
              href="/"
              className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            >
              Home
            </a>
            <a
              href="/admin"
              className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            >
              Admin
            </a>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-10">
            Loading scores...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-slate-400 text-center py-10">
            No scores yet. Finish a game to appear on the leaderboard.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-xs uppercase">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-right">Time</th>
                  <th className="px-3 py-2 text-right">Errors</th>
                  <th className="px-3 py-2 text-right">Completed</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr
                    key={`${entry._id || entry.id || i}-${i}`}
                    className={`border-t border-slate-700 ${i === 0 ? "bg-yellow-900/30" : "bg-slate-800/50"}`}
                  >
                    <td className="px-3 py-2 font-bold text-slate-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold truncate max-w-[160px]">
                      {entry.teamName || entry.team}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-green-400">
                      {formatTime(entry.timeTaken)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-400">
                      {entry.errors}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">
                      {entry.completedAt
                        ? new Date(entry.completedAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
