import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Webcam from "react-webcam";
import * as mobilenet from "@tensorflow-models/mobilenet";
import "@tensorflow/tfjs";
import { shuffleItems } from "../lib/items";
import { Camera, CheckCircle2, Trophy, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function ScavengerHunt() {
  const [teamName, setTeamName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [message, setMessage] = useState("Point camera at the item");
  const webcamRef = useRef(null);

  // Load AI Model on mount
  useEffect(() => {
    const loadModel = async () => {
      const m = await mobilenet.load();
      setModel(m);
    };
    loadModel();
  }, []);

  const startGame = () => {
    if (!teamName) return alert("Enter Team Name");
    const teamQuestions = shuffleItems(teamName);
    setQuestions(teamQuestions);
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

      // Check if any prediction matches our item keywords
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
          setCurrentIndex(questions.length); // Game Over / Win
        }
      } else {
        setMessage(`Not quite. Is that a ${currentItem.name}? Try again!`);
      }
      setIsLoading(false);
    };
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Office Scavenger Hunt
        </h1>
        <input
          className="bg-slate-800 border border-slate-700 p-4 rounded-xl w-full max-w-sm mb-4"
          placeholder="Enter Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold w-full max-w-sm transition"
        >
          START GAME
        </button>
      </div>
    );
  }

  if (currentIndex >= questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-6 text-center">
        <Trophy size={80} className="text-yellow-400 mb-4" />
        <h1 className="text-4xl font-bold mb-2">MISSION COMPLETE</h1>
        <p className="text-xl mb-8">Team {teamName} finished the hunt!</p>
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
          Item {currentIndex + 1}/{questions.length}
        </span>
        <span className="text-blue-400">{teamName}</span>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-light">Find and take a photo of:</h2>
          <h3 className="text-4xl font-black uppercase tracking-tight text-blue-500">
            {questions[currentIndex]?.name}
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
