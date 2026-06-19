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
import { colors } from "../lib/colors";

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
    setActiveTab("hunt-master");
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
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {!isAuthenticated ? (
        <div className="max-w-md mx-auto pt-16">
          <div
            className="w-full p-8 rounded-lg"
            style={{ backgroundColor: colors.primaryLighter }}
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Admin Login</h1>
              <a
                href="/"
                className="transition"
                style={{ color: colors.primary }}
              >
                ← Back to Game
              </a>
            </div>

            <form onSubmit={handleLogin}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 rounded-lg mb-4 focus:outline-none"
                style={{
                  backgroundColor: colors.primaryLightest,
                  color: colors.text,
                  border: `1px solid ${colors.primary}`,
                }}
                onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                onBlur={(e) => (e.target.style.borderColor = colors.primary)}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-sm mb-4"
                style={{ color: colors.secondaryText }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              <button
                type="submit"
                className="w-full py-2 rounded-lg font-bold transition"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.background,
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = colors.primaryDark)
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = colors.primary)
                }
              >
                Login
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg transition"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.background,
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = colors.accentDark)
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = colors.accent)
                }
              >
                Logout
              </button>
              <a
                href="/"
                className="transition"
                style={{ color: colors.primary }}
              >
                ← Back to Game
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-4 mb-8"
            style={{ borderBottom: `1px solid ${colors.primaryBorder}` }}
          >
            <button
              onClick={() => setActiveTab("hunt-master")}
              className="px-6 py-3 font-semibold transition border-b-2"
              style={{
                color:
                  activeTab === "hunt-master"
                    ? colors.primary
                    : colors.secondaryText,
                borderBottomColor:
                  activeTab === "hunt-master" ? colors.primary : "transparent",
              }}
            >
              Hunt Master Setup
            </button>
            <button
              onClick={() => setActiveTab("scores")}
              className="px-6 py-3 font-semibold transition border-b-2"
              style={{
                color:
                  activeTab === "scores"
                    ? colors.primary
                    : colors.secondaryText,
                borderBottomColor:
                  activeTab === "scores" ? colors.primary : "transparent",
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
                color:
                  activeTab === "colleagues"
                    ? colors.primary
                    : colors.secondaryText,
                borderBottomColor:
                  activeTab === "colleagues" ? colors.primary : "transparent",
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
                style={{ color: colors.secondaryText }}
              >
                Capture your face so participants must find <strong>you</strong>{" "}
                during the hunt.
              </p>

              <div
                className="relative rounded-3xl overflow-hidden w-full max-w-sm aspect-square mb-4"
                style={{ border: `4px solid ${colors.primaryBorder}` }}
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
                    style={{ backgroundColor: colors.blueOverlayLight }}
                  >
                    <Loader2 className="animate-spin" size={40} />
                    <span
                      className="text-sm"
                      style={{ color: colors.secondaryText }}
                    >
                      Loading models...
                    </span>
                  </div>
                )}
                {saved && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: colors.blueOverlayLight }}
                  >
                    <CheckCircle2 size={64} style={{ color: colors.accent }} />
                  </div>
                )}
              </div>

              <p
                className="mb-6 text-center text-sm"
                style={{ color: saved ? colors.accent : colors.secondaryText }}
              >
                {status}
              </p>

              <button
                onClick={capture}
                disabled={!modelsLoaded || isCapturing}
                className="disabled:opacity-50 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition flex items-center justify-center gap-3 mb-4"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.background,
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = colors.primaryDark)
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = colors.primary)
                }
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
                  style={{ color: colors.accent }}
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
              <div>
                <div
                  className="flex justify-between items-center mb-8"
                  style={{ color: colors.text }}
                >
                  <h2 className="text-2xl font-bold">All Scores</h2>
                </div>

                <div className="flex gap-4 mb-8">
                  <button
                    onClick={fetchScores}
                    className="px-4 py-2 rounded-lg transition"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.background,
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = colors.primaryDark)
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = colors.primary)
                    }
                  >
                    Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    style={{
                      backgroundColor: colors.accent,
                      color: colors.background,
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = colors.accentDark)
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = colors.accent)
                    }
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>

                {scoresLoading ? (
                  <div
                    className="text-center py-8"
                    style={{ color: colors.secondaryText }}
                  >
                    Loading scores...
                  </div>
                ) : scores.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-lg"
                    style={{
                      color: colors.secondaryText,
                      backgroundColor: colors.primaryLighter,
                    }}
                  >
                    No scores yet
                  </div>
                ) : (
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${colors.primaryBorder}` }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr
                          className="text-sm"
                          style={{
                            backgroundColor: colors.primaryLight,
                            color: colors.secondaryText,
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
                            style={{
                              borderTop: `1px solid ${colors.primaryBorder}`,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                colors.primaryLightest)
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
                              style={{ color: colors.accent }}
                            >
                              {formatTime(score.timeTaken)}
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              style={{ color: colors.danger }}
                            >
                              {score.errors}
                            </td>
                            <td
                              className="px-4 py-3 text-sm"
                              style={{ color: colors.secondaryText }}
                            >
                              {new Date(score.completedAt).toLocaleString()}
                            </td>
                            <td
                              className="px-4 py-3 text-sm"
                              style={{ color: colors.secondaryText }}
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
                  style={{
                    backgroundColor: colors.accentLight,
                    color: colors.secondaryText,
                    border: `1px solid ${colors.accentBorder}`,
                  }}
                >
                  <p>Total scores: {scores.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Colleagues Tab */}
          {activeTab === "colleagues" && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col items-center gap-6">
                <div className="text-center max-w-sm">
                  <h2 className="text-2xl font-bold mb-2">Add Colleague</h2>
                  <p style={{ color: colors.secondaryText }}>
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
                    backgroundColor: colors.primaryLightest,
                    color: colors.text,
                    border: `1px solid ${colors.primary}`,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = colors.primary)}
                />

                <textarea
                  placeholder="Enter a riddle for this colleague (e.g., 'I love debugging code and drinking coffee')"
                  value={colleagueRiddle}
                  onChange={(e) => setColleagueRiddle(e.target.value)}
                  className="px-4 py-2 rounded-lg outline-none transition max-w-sm w-full h-24 resize-none"
                  style={{
                    backgroundColor: colors.primaryLightest,
                    color: colors.text,
                    border: `1px solid ${colors.primary}`,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) => (e.target.style.borderColor = colors.primary)}
                />

                <div
                  className="relative rounded-3xl overflow-hidden w-full max-w-sm aspect-square"
                  style={{ border: `4px solid ${colors.primaryBorder}` }}
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
                      style={{ backgroundColor: colors.darkOverlayLight }}
                    >
                      <Loader2 className="animate-spin" size={40} />
                      <span
                        className="text-sm"
                        style={{ color: colors.secondaryText }}
                      >
                        Loading models...
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={captureColleague}
                  disabled={isCapturingColleague || !modelsLoaded}
                  className="disabled:opacity-50 px-6 py-3 rounded-lg font-bold transition flex items-center gap-2"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.background,
                  }}
                  onMouseEnter={(e) =>
                    !e.currentTarget.disabled &&
                    (e.currentTarget.style.backgroundColor = colors.primaryDark)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.primary)
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
                        ? colors.accent
                        : colleagueStatus.startsWith("❌")
                          ? colors.danger
                          : colors.primary,
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
                    style={{
                      backgroundColor: colors.accentLight,
                      color: colors.accent,
                      border: `1px solid ${colors.accentBorder}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        colors.accentMedium)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        colors.accentLight)
                    }
                  >
                    Refresh
                  </button>
                </div>

                {colleaguesLoading ? (
                  <div
                    className="text-center py-8"
                    style={{ color: colors.secondaryText }}
                  >
                    Loading colleagues...
                  </div>
                ) : colleagues.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-lg"
                    style={{
                      color: colors.secondaryText,
                      backgroundColor: colors.primaryLighter,
                    }}
                  >
                    No colleagues added yet
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {colleagues.map((colleague) => (
                      <div
                        key={colleague._id}
                        className="rounded-lg p-4 flex flex-col justify-between border"
                        style={{
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primaryBorder,
                        }}
                      >
                        <div>
                          <p
                            className="font-bold mb-2"
                            style={{ color: colors.text }}
                          >
                            {colleague.name}
                          </p>
                          <p
                            className="text-sm mb-3 italic"
                            style={{ color: colors.secondaryText }}
                          >
                            "{colleague.riddle}"
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: colors.tertiaryText }}
                          >
                            Face descriptor: {colleague.faceDescriptor.length}{" "}
                            values
                          </p>
                        </div>
                        <button
                          onClick={() => deleteColleague(colleague.name)}
                          className="p-2 rounded-lg transition mt-3 flex items-center justify-center"
                          style={{
                            backgroundColor: colors.accent,
                            color: colors.background,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.accentDark)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.accent)
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
      )}
    </div>
  );
}
