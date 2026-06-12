import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Webcam from "react-webcam";
import * as mobilenet from "@tensorflow-models/mobilenet";
import "@tensorflow/tfjs";
import { shuffleItems } from "../lib/items";
import { Camera, CheckCircle2, Trophy, Loader2, Medal } from "lucide-react";
import confetti from "canvas-confetti";

const LEADERBOARD_KEY = "office-hunt-leaderboard";

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveResult(team, timeTaken, errors) {
  const board = getLeaderboard();
  board.push({ team, timeTaken, errors, completedAt: Date.now() });
  board.sort((a, b) => a.timeTaken - b.timeTaken || a.errors - b.errors);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  return board;
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
  const [message, setMessage] = useState("Point camera at the item");
  const [errorCount, setErrorCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const webcamRef = useRef(null);

  useEffect(() => {
    if (!gameStarted || currentIndex >= questions.length) return;
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, startTime, currentIndex, questions.length]);

  // Load AI Model and leaderboard on mount
  useEffect(() => {
    const loadModel = async () => {
      const m = await mobilenet.load();
      setModel(m);
    };
    loadModel();
    setLeaderboard(getLeaderboard());
  }, []);

  const startGame = () => {
    if (!teamName.trim()) return alert("Enter Team Name");
    const teamQuestions = shuffleItems(teamName);
    setQuestions(teamQuestions);
    setErrorCount(0);
    setStartTime(Date.now());
    setGameStarted(true);
  };

  const captureAndVerify = async () => {
    if (!model || !webcamRef.current) return;
    setIsLoading(true);
    setMessage("Analyzing...");

    const imageSrc = webcamRef.current.getScreenshot();
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const predictions = await model.classify(img);
      const currentItem = questions[currentIndex];

      const found = predictions.some((p) =>
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
          const updatedBoard = saveResult(teamName, timeTaken, errorCount);
          setFinalResult({ timeTaken, errors: errorCount });
          setLeaderboard(updatedBoard);
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
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition mb-10"
        >
          START GAME
        </button>

        {leaderboard.length > 0 && (
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <Medal size={20} className="text-yellow-400" />
              <h2 className="text-lg font-bold text-yellow-400 uppercase tracking-wide">
                Leaderboard
              </h2>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-right">Time</th>
                    <th className="px-3 py-2 text-right">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-700 ${i === 0 ? "bg-yellow-900/30" : "bg-slate-800/50"}`}
                    >
                      <td className="px-3 py-2 font-bold text-slate-400">
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold truncate max-w-[120px]">
                        {entry.team}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-green-400">
                        {formatTime(entry.timeTaken)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-400">
                        {entry.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

        {leaderboard.length > 0 && (
          <div className="w-full max-w-sm mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Medal size={18} className="text-yellow-400" />
              <h2 className="text-base font-bold text-yellow-400 uppercase tracking-wide">
                Leaderboard
              </h2>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black/30 text-white/60 text-xs uppercase">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-right">Time</th>
                    <th className="px-3 py-2 text-right">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={i}
                      className={`border-t border-white/10 ${entry.team === teamName && entry.timeTaken === finalResult?.timeTaken ? "bg-yellow-500/20 font-bold" : "bg-black/20"}`}
                    >
                      <td className="px-3 py-2 text-white/60">
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : i + 1}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[120px]">
                        {entry.team}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-green-300">
                        {formatTime(entry.timeTaken)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-300">
                        {entry.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
          disabled={isLoading || !model}
          className="mt-8 bg-white text-black p-6 rounded-full shadow-xl active:scale-95 transition disabled:opacity-50"
        >
          <Camera size={32} />
        </button>
      </div>
    </div>
  );
}
