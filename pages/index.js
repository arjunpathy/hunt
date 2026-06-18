import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Webcam from "react-webcam";
import * as mobilenet from "@tensorflow-models/mobilenet";
import "@tensorflow/tfjs";
import { shuffleItems } from "../lib/items";
import { Camera, Trophy, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

function normalizeTeamName(teamName) {
  return String(teamName || "")
    .trim()
    .toLowerCase();
}

function getTeamKeyStorageKey(teamName) {
  return `hunt-team-key:${normalizeTeamName(teamName)}`;
}

async function saveResult(team, timeTaken, errors) {
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: team, timeTaken, errors }),
    });
    if (!response.ok) throw new Error("Failed to save score");
    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error("Error saving result:", error);
    return [];
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ScavengerHunt() {
  const [teamName, setTeamName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const faceapiRef = useRef(null);
  const [message, setMessage] = useState("Point camera at the item");
  const [errorCount, setErrorCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    if (!gameStarted || currentIndex >= questions.length) return;
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, startTime, currentIndex, questions.length]);

  // Load AI Models on mount
  useEffect(() => {
    const loadModels = async () => {
      const faceapi = await import("@vladmandic/face-api");
      faceapiRef.current = faceapi;
      const [m] = await Promise.all([
        mobilenet.load(),
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      setModel(m);
      setFaceModelsLoaded(true);
    };
    loadModels();
  }, []);

  const startGame = async () => {
    const cleanedTeamName = teamName.trim();
    if (!cleanedTeamName) return alert("Enter Team Name");

    try {
      setIsStarting(true);
      const teamStorageKey = getTeamKeyStorageKey(cleanedTeamName);
      const existingTeamKey =
        typeof window !== "undefined"
          ? localStorage.getItem(teamStorageKey) || ""
          : "";

      const response = await fetch("/api/team-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: cleanedTeamName,
          teamKey: existingTeamKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Failed to start team session",
        );
      }

      if (data.teamKey && typeof window !== "undefined") {
        localStorage.setItem(teamStorageKey, data.teamKey);
      }

      const teamQuestions = shuffleItems(cleanedTeamName);
      setQuestions(teamQuestions);
      setErrorCount(0);
      setStartTime(Date.now());
      setGameStarted(true);
      setTeamName(cleanedTeamName);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const captureAndVerify = async () => {
    if (!model || !webcamRef.current) return;
    setIsLoading(true);
    setMessage("Analyzing...");

    const currentItem = questions[currentIndex];

    if (currentItem.type === "person") {
      const faceapi = faceapiRef.current;
      // Use face recognition against saved descriptor
      const savedRaw = localStorage.getItem("hunt-master-descriptor");
      if (!savedRaw) {
        setMessage(
          "No Hunt Master face saved. Ask the admin to visit /admin first.",
        );
        setIsLoading(false);
        return;
      }
      const savedDescriptor = new Float32Array(JSON.parse(savedRaw));
      const video = webcamRef.current.video;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setErrorCount((c) => c + 1);
        setMessage("No face detected. Try again!");
        setIsLoading(false);
        return;
      }

      const distance = faceapi.euclideanDistance(
        savedDescriptor,
        detection.descriptor,
      );
      // distance < 0.5 is a confident match
      const found = distance < 0.5;
      if (found) {
        if (currentIndex + 1 < questions.length) {
          confetti();
          setCurrentIndex(currentIndex + 1);
          setMessage("Correct! Find the next item.");
        } else {
          confetti({ particleCount: 150, spread: 70 });
          const timeTaken = Math.round((Date.now() - startTime) / 1000);
          await saveResult(teamName, timeTaken, errorCount);
          setFinalResult({ timeTaken, errors: errorCount });
          setCurrentIndex(questions.length);
        }
      } else {
        setErrorCount((c) => c + 1);
        setMessage("Not quite. Try again!");
      }
      setIsLoading(false);
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const predictions = await model.classify(img);
      let found = predictions.some((p) =>
        currentItem.keywords.some((k) => p.className.toLowerCase().includes(k)),
      );

      if (found) {
        if (currentIndex + 1 < questions.length) {
          confetti();
          setCurrentIndex(currentIndex + 1);
          setMessage("Correct! Find the next item.");
        } else {
          confetti({ particleCount: 150, spread: 70 });
          const timeTaken = Math.round((Date.now() - startTime) / 1000);
          await saveResult(teamName, timeTaken, errorCount);
          setFinalResult({ timeTaken, errors: errorCount });
          setCurrentIndex(questions.length);
        }
      } else {
        setErrorCount((c) => c + 1);
        setMessage("Not quite. Try again!");
      }
      setIsLoading(false);
    };
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-bold mt-10 mb-8 text-center">
          Office Scavenger Hunt
        </h1>
        <input
          className="bg-slate-800 border border-slate-700 p-4 rounded-xl w-full max-w-sm mb-4"
          placeholder="Enter Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startGame()}
        />
        <button
          onClick={startGame}
          disabled={isStarting}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition mb-4"
        >
          {isStarting ? "Starting..." : "START GAME"}
        </button>
        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-10">
          <a
            href="/scores-management"
            className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-center font-semibold hover:bg-slate-700 transition"
          >
            Scores
          </a>
          <a
            href="/admin"
            className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-center font-semibold hover:bg-slate-700 transition"
          >
            Admin
          </a>
        </div>
      </div>
    );
  }

  if (currentIndex >= questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-6 text-center">
        <Trophy size={80} className="text-yellow-400 mb-4" />
        <h1 className="text-4xl font-bold mb-2">MISSION COMPLETE</h1>
        <p className="text-xl mb-1">Team {teamName} finished the hunt!</p>
        {finalResult && (
          <div className="flex gap-6 mt-2 mb-8 text-lg">
            <span>
              ⏱{" "}
              <span className="font-mono font-bold">
                {formatTime(finalResult.timeTaken)}
              </span>
            </span>
            <span>
              ❌ <span className="font-bold">{finalResult.errors}</span> errors
            </span>
          </div>
        )}

        <a
          href="/scores-management"
          className="mb-6 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full font-semibold transition"
        >
          View Scores
        </a>

        <button
          onClick={() => window.location.reload()}
          className="bg-white text-green-900 px-6 py-2 rounded-full font-bold"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="p-4 bg-slate-900 flex justify-between items-center">
        <span className="font-bold">
          {currentIndex + 1}/{questions.length}
        </span>
        <span className="font-mono text-green-400">{formatTime(elapsed)}</span>
        <span className="text-slate-400 text-sm">
          ❌ {errorCount} &nbsp;
          <span className="text-blue-400">{teamName}</span>
        </span>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-light mb-2">
            Riddle {currentIndex + 1}:
          </h2>
          <h3 className="text-xl font-semibold text-blue-400 italic">
            {questions[currentIndex]?.riddle}
          </h3>
        </div>

        <div className="relative rounded-3xl overflow-hidden border-4 border-slate-800 w-full max-w-md aspect-square">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "environment" }}
            className="w-full h-full object-cover"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="animate-spin" size={48} />
            </div>
          )}
        </div>

        <p className="mt-4 text-slate-400 italic text-center">{message}</p>

        <button
          onClick={captureAndVerify}
          disabled={isLoading || !model || !faceModelsLoaded}
          className="mt-8 bg-white text-black p-6 rounded-full shadow-xl active:scale-10 transition disabled:opacity-50"
        >
          <Camera size={32} />
        </button>
      </div>
    </div>
  );
}
