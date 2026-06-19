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

  // Colleagues state
  const [colleagues, setColleagues] = useState([]);
  const [colleaguesLoading, setColleaguesLoading] = useState(false);
  const [colleagueName, setColleagueName] = useState("");
  const [colleagueRiddle, setColleagueRiddle] = useState("");
  const colleagueWebcamRef = useRef(null);
  const [isCapturingColleague, setIsCapturingColleague] = useState(false);
  const [colleagueStatus, setColleagueStatus] = useState("");

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

  const captureColleague = async () => {
    if (!modelsLoaded || !colleagueWebcamRef.current) return;
    if (!colleagueName.trim()) {
      alert("Enter colleague name first");
      return;
    }
    if (!colleagueRiddle.trim()) {
      alert("Enter a riddle for the colleague");
      return;
    }

    try {
      setIsCapturingColleague(true);
      setColleagueStatus("Detecting face...");

      const faceapi = faceapiRef.current;
      const video = colleagueWebcamRef.current.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setColleagueStatus("No face detected. Try again!");
        setIsCapturingColleague(false);
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);
      const response = await fetch("/api/colleagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: colleagueName.trim(),
          riddle: colleagueRiddle.trim(),
          faceDescriptor,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error);
      }

      setColleagueStatus(`✅ Colleague "${colleagueName}" saved successfully!`);
      setColleagueName("");
      setColleagueRiddle("");
      await fetchColleagues();
      setIsCapturingColleague(false);
    } catch (error) {
      setColleagueStatus(`❌ Error: ${error.message}`);
      setIsCapturingColleague(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      setColleaguesLoading(true);
      const response = await fetch("/api/colleagues");
      if (!response.ok) throw new Error("Failed to fetch colleagues");
      const data = await response.json();
      setColleagues(data.colleagues || []);
    } catch (error) {
      console.error("Error fetching colleagues:", error);
      alert("Failed to load colleagues");
    } finally {
      setColleaguesLoading(false);
    }
  };

  const deleteColleague = async (name) => {
    if (!confirm(`Delete colleague "${name}"?`)) return;

    try {
      const response = await fetch("/api/colleagues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to delete colleague");
      await fetchColleagues();
    } catch (error) {
      alert("Failed to delete colleague: " + error.message);
    }
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
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "#181818", color: "#fdf7de" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <a href="/" className="transition" style={{ color: "#0079ff" }}>
            ← Back to Game
          </a>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-4 mb-8"
          style={{ borderBottom: "1px solid #333333" }}
        >
          <button
            onClick={() => setActiveTab("hunt-master")}
            className="px-6 py-3 font-semibold transition border-b-2"
            style={{
              color: activeTab === "hunt-master" ? "#0079ff" : "#999999",
              borderBottomColor:
                activeTab === "hunt-master" ? "#0079ff" : "transparent",
            }}
          >
            Hunt Master Setup
          </button>
          <button
            onClick={() => setActiveTab("scores")}
            className="px-6 py-3 font-semibold transition border-b-2"
            style={{
              color: activeTab === "scores" ? "#0079ff" : "#999999",
              borderBottomColor:
                activeTab === "scores" ? "#0079ff" : "transparent",
            }}
          >
            Scores Management
          </button>
          <button
            onClick={() => {
              setActiveTab("colleagues");
              fetchColleagues();
            }}
            className="px-6 py-3 font-semibold transition border-b-2"
            style={{
              color: activeTab === "colleagues" ? "#0079ff" : "#999999",
              borderBottomColor:
                activeTab === "colleagues" ? "#0079ff" : "transparent",
            }}
          >
            Manage Colleagues
          </button>
        </div>

        {/* Hunt Master Tab */}
        {activeTab === "hunt-master" && (
          <div className="flex flex-col items-center">
            <p
              className="mb-8 text-center max-w-sm"
              style={{ color: "#999999" }}
            >
              Capture your face so participants must find <strong>you</strong>{" "}
              during the hunt.
            </p>

            <div
              className="relative rounded-3xl overflow-hidden w-full max-w-sm aspect-square mb-4"
              style={{ border: "4px solid #333333" }}
            >
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full h-full object-cover"
              />
              {!modelsLoaded && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  style={{ backgroundColor: "rgba(0, 121, 255, 0.1)" }}
                >
                  <Loader2 className="animate-spin" size={40} />
                  <span className="text-sm" style={{ color: "#999999" }}>
                    Loading models...
                  </span>
                </div>
              )}
              {saved && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: "rgba(0, 121, 255, 0.3)" }}
                >
                  <CheckCircle2 size={64} style={{ color: "#fece00" }} />
                </div>
              )}
            </div>

            <p
              className="mb-6 text-center text-sm"
              style={{ color: saved ? "#fece00" : "#999999" }}
            >
              {status}
            </p>

            <button
              onClick={capture}
              disabled={!modelsLoaded || isCapturing}
              className="disabled:opacity-50 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition flex items-center justify-center gap-3 mb-4"
              style={{ backgroundColor: "#0079ff", color: "#181818" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0066dd")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0079ff")}
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
                className="flex items-center gap-2 text-sm transition"
                style={{ color: "#fece00" }}
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
                  className="w-full max-w-md p-8 rounded-lg"
                  style={{ backgroundColor: "rgba(0, 121, 255, 0.08)" }}
                >
                  <h2 className="text-2xl font-bold mb-6">Scores Management</h2>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-2 rounded-lg mb-4 focus:outline-none"
                    style={{
                      backgroundColor: "rgba(0, 121, 255, 0.1)",
                      color: "#fdf7de",
                      border: "1px solid #0079ff",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#0079ff")}
                    onBlur={(e) => (e.target.style.borderColor = "#444444")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-sm mb-4"
                    style={{ color: "#999999" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg font-bold transition"
                    style={{ backgroundColor: "#0079ff", color: "#181818" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#0066dd")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#0079ff")
                    }
                  >
                    Login
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div
                  className="flex justify-between items-center mb-8"
                  style={{ color: "#fdf7de" }}
                >
                  <h2 className="text-2xl font-bold">All Scores</h2>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg transition"
                    style={{ backgroundColor: "#fece00", color: "#181818" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#f5b300")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#fece00")
                    }
                  >
                    Logout
                  </button>
                </div>

                <div className="flex gap-4 mb-8">
                  <button
                    onClick={fetchScores}
                    className="px-4 py-2 rounded-lg transition"
                    style={{ backgroundColor: "#0079ff", color: "#181818" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#0066dd")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#0079ff")
                    }
                  >
                    Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    style={{ backgroundColor: "#fece00", color: "#181818" }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#f5b300")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#fece00")
                    }
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>

                {scoresLoading ? (
                  <div
                    className="text-center py-8"
                    style={{ color: "#999999" }}
                  >
                    Loading scores...
                  </div>
                ) : scores.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-lg"
                    style={{ color: "#999999", backgroundColor: "rgba(0, 121, 255, 0.08)" }}
                  >
                    No scores yet
                  </div>
                ) : (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid #333333" }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr
                          className="text-sm"
                          style={{
                            backgroundColor: "rgba(0, 121, 255, 0.05)",
                            color: "#999999",
                          }}
                        >
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
                            className="transition"
                            style={{ borderTop: "1px solid #333333" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "rgba(0, 121, 255, 0.1)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "transparent")
                            }
                          >
                            <td className="px-4 py-3 font-semibold">
                              {score.teamName}
                            </td>
                            <td
                              className="px-4 py-3 text-right font-mono"
                              style={{ color: "#fece00" }}
                            >
                              {formatTime(score.timeTaken)}
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              style={{ color: "#ff6b6b" }}
                            >
                              {score.errors}
                            </td>
                            <td
                              className="px-4 py-3 text-sm"
                              style={{ color: "#999999" }}
                            >
                              {new Date(score.completedAt).toLocaleString()}
                            </td>
                            <td
                              className="px-4 py-3 text-sm"
                              style={{ color: "#999999" }}
                            >
                              {new Date(score.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div
                  className="mt-8 p-4 rounded-lg text-sm"
                  style={{ backgroundColor: "rgba(254, 206, 0, 0.08)", color: "#999999", border: "1px solid rgba(254, 206, 0, 0.2)" }}
                >
                  <p>Total scores: {scores.length}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Colleagues Tab */}
        {activeTab === "colleagues" && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center max-w-sm">
                <h2 className="text-2xl font-bold mb-2">Add Colleague</h2>
                <p style={{ color: "#999999" }}>
                  Capture colleague photos to use as game answers
                </p>
              </div>

              <input
                type="text"
                placeholder="Colleague name"
                value={colleagueName}
                onChange={(e) => setColleagueName(e.target.value)}
                className="px-4 py-2 rounded-lg outline-none transition max-w-sm w-full"
                style={{
                  backgroundColor: "rgba(0, 121, 255, 0.1)",
                  color: "#fdf7de",
                  border: "1px solid #0079ff",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0079ff")}
                onBlur={(e) => (e.target.style.borderColor = "#444444")}
              />

              <textarea
                placeholder="Enter a riddle for this colleague (e.g., 'I love debugging code and drinking coffee')"
                value={colleagueRiddle}
                onChange={(e) => setColleagueRiddle(e.target.value)}
                className="px-4 py-2 rounded-lg outline-none transition max-w-sm w-full h-24 resize-none"
                style={{
                  backgroundColor: "rgba(0, 121, 255, 0.1)",
                  color: "#fdf7de",
                  border: "1px solid #0079ff",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0079ff")}
                onBlur={(e) => (e.target.style.borderColor = "#444444")}
              />

              <div
                className="relative rounded-3xl overflow-hidden w-full max-w-sm aspect-square"
                style={{ border: "4px solid #333333" }}
              >
                <Webcam
                  audio={false}
                  ref={colleagueWebcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="w-full h-full object-cover"
                />
                {!modelsLoaded && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ backgroundColor: "rgba(24, 24, 24, 0.85)" }}
                  >
                    <Loader2 className="animate-spin" size={40} />
                    <span className="text-sm" style={{ color: "#999999" }}>
                      Loading models...
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={captureColleague}
                disabled={isCapturingColleague || !modelsLoaded}
                className="disabled:opacity-50 px-6 py-3 rounded-lg font-bold transition flex items-center gap-2"
                style={{ backgroundColor: "#0079ff", color: "#181818" }}
                onMouseEnter={(e) =>
                  !e.currentTarget.disabled &&
                  (e.currentTarget.style.backgroundColor = "#0066dd")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0079ff")
                }
              >
                {isCapturingColleague ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    Capture & Save
                  </>
                )}
              </button>

              {colleagueStatus && (
                <p
                  className="text-center text-sm"
                  style={{
                    color: colleagueStatus.startsWith("✅")
                      ? "#fece00"
                      : colleagueStatus.startsWith("❌")
                        ? "#ff6b6b"
                        : "#0079ff",
                  }}
                >
                  {colleagueStatus}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Saved Colleagues</h3>
                <button
                  onClick={fetchColleagues}
                  className="px-4 py-2 rounded-lg transition text-sm"
                  style={{ backgroundColor: "rgba(254, 206, 0, 0.15)", color: "#181818", border: "1px solid rgba(254, 206, 0, 0.3)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(254, 206, 0, 0.25)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(254, 206, 0, 0.15)")
                  }
                >
                  Refresh
                </button>
              </div>

              {colleaguesLoading ? (
                <div className="text-center py-8" style={{ color: "#999999" }}>
                  Loading colleagues...
                </div>
              ) : colleagues.length === 0 ? (
                <div
                  className="text-center py-8 rounded-lg"
                  style={{ color: "#999999", backgroundColor: "rgba(0, 121, 255, 0.08)" }}
                >
                  No colleagues added yet
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {colleagues.map((colleague) => (
                    <div
                      key={colleague._id}
                      className="rounded-lg p-4 flex flex-col justify-between border"
                      style={{ backgroundColor: "rgba(0, 121, 255, 0.05)", borderColor: "rgba(0, 121, 255, 0.2)" }}
                    >
                      <div>
                        <p
                          className="font-bold mb-2"
                          style={{ color: "#fdf7de" }}
                        >
                          {colleague.name}
                        </p>
                        <p
                          className="text-sm mb-3 italic"
                          style={{ color: "#999999" }}
                        >
                          "{colleague.riddle}"
                        </p>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          Face descriptor: {colleague.faceDescriptor.length}{" "}
                          values
                        </p>
                      </div>
                      <button
                        onClick={() => deleteColleague(colleague.name)}
                        className="p-2 rounded-lg transition mt-3 flex items-center justify-center"
                        style={{ backgroundColor: "#fece00", color: "#181818" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#f5b300")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#fece00")
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
