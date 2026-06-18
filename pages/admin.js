import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Webcam from "react-webcam";
import {
  Camera,
  Loader2,
  CheckCircle2,
  Trash2,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";

const DESCRIPTOR_KEY = "hunt-master-descriptor";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AdminPanel() {
  const router = useRouter();
  const { tab: queryTab } = router.query;
  const [activeTab, setActiveTab] = useState("hunt-master");

  // Hunt Master state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("Loading face models...");
  const [saved, setSaved] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);
  const faceapiRef = useRef(null);

  // Scores Management state
  const [scores, setScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const ADMIN_PASSWORD = "admin123";

  useEffect(() => {
    const load = async () => {
      const faceapi = await import("@vladmandic/face-api");
      faceapiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      setModelsLoaded(true);
      setStatus("Models ready. Position your face and capture.");
      setHasSaved(!!localStorage.getItem(DESCRIPTOR_KEY));
    };
    load();

    // Set active tab from query parameter
    if (queryTab === "scores") {
      setActiveTab("scores");
    }
  }, [queryTab]);

  const capture = async () => {
    if (!modelsLoaded || !webcamRef.current) return;
    const faceapi = faceapiRef.current;
    setIsCapturing(true);
    setStatus("Detecting face...");

    const video = webcamRef.current.video;
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      setStatus("No face detected. Make sure your face is clearly visible.");
      setIsCapturing(false);
      return;
    }

    const descriptorArray = Array.from(detection.descriptor);
    localStorage.setItem(DESCRIPTOR_KEY, JSON.stringify(descriptorArray));
    setSaved(true);
    setHasSaved(true);
    setStatus("Your face has been saved as the Hunt Master!");
    setIsCapturing(false);
  };

  const clear = () => {
    localStorage.removeItem(DESCRIPTOR_KEY);
    setHasSaved(false);
    setSaved(false);
    setStatus(
      "Reference cleared. Capture a new photo to set a new Hunt Master.",
    );
  };

  const fetchScores = async () => {
    try {
      setScoresLoading(true);
      const response = await fetch("/api/leaderboard?type=all");
      if (!response.ok) throw new Error("Failed to fetch scores");
      const data = await response.json();
      setScores(data.scores || []);
    } catch (error) {
      console.error("Error fetching scores:", error);
      alert("Failed to load scores");
    } finally {
      setScoresLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
      fetchScores();
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

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <a
            href="/"
            className="text-slate-500 hover:text-slate-300 transition"
          >
            ← Back to Game
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("hunt-master")}
            className={`px-6 py-3 font-semibold transition border-b-2 ${
              activeTab === "hunt-master"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            Hunt Master Setup
          </button>
          <button
            onClick={() => setActiveTab("scores")}
            className={`px-6 py-3 font-semibold transition border-b-2 ${
              activeTab === "scores"
                ? "text-blue-400 border-blue-400"
                : "text-slate-400 border-transparent hover:text-slate-300"
            }`}
          >
            Scores Management
          </button>
        </div>

        {/* Hunt Master Tab */}
        {activeTab === "hunt-master" && (
          <div className="flex flex-col items-center">
            <p className="text-slate-400 mb-8 text-center max-w-sm">
              Capture your face so participants must find <strong>you</strong>{" "}
              during the hunt.
            </p>

            <div className="relative rounded-3xl overflow-hidden border-4 border-slate-700 w-full max-w-sm aspect-square mb-4">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full h-full object-cover"
              />
              {!modelsLoaded && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin" size={40} />
                  <span className="text-sm text-slate-300">
                    Loading models...
                  </span>
                </div>
              )}
              {saved && (
                <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center">
                  <CheckCircle2 size={64} className="text-green-400" />
                </div>
              )}
            </div>

            <p
              className={`mb-6 text-center text-sm ${
                saved ? "text-green-400" : "text-slate-400"
              }`}
            >
              {status}
            </p>

            <button
              onClick={capture}
              disabled={!modelsLoaded || isCapturing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition flex items-center justify-center gap-3 mb-4"
            >
              {isCapturing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Camera size={20} />
              )}
              {hasSaved ? "Recapture Face" : "Save My Face"}
            </button>

            {hasSaved && (
              <button
                onClick={clear}
                className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm transition"
              >
                <Trash2 size={16} />
                Clear saved face
              </button>
            )}
          </div>
        )}

        {/* Scores Management Tab */}
        {activeTab === "scores" && (
          <div>
            {!isAuthenticated ? (
              <div className="flex justify-center">
                <form
                  onSubmit={handleLogin}
                  className="w-full max-w-md p-8 bg-slate-800 rounded-lg"
                >
                  <h2 className="text-2xl font-bold mb-6">Scores Management</h2>
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
            ) : (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">All Scores</h2>
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

                {scoresLoading ? (
                  <div className="text-center text-slate-400">
                    Loading scores...
                  </div>
                ) : scores.length === 0 ? (
                  <div className="text-center text-slate-400">
                    No scores yet
                  </div>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
