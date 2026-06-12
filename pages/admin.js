import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Camera, Loader2, CheckCircle2, Trash2 } from "lucide-react";

const DESCRIPTOR_KEY = "hunt-master-descriptor";

export default function AdminSetup() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("Loading face models...");
  const [saved, setSaved] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);
  const faceapiRef = useRef(null);

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
  }, []);

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

    // Store descriptor as plain array in localStorage
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-3xl font-bold mt-10 mb-2 text-center">Admin Setup</h1>
      <p className="text-slate-400 mb-8 text-center max-w-sm">
        Capture your face so participants must find <strong>you</strong> during
        the hunt.
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
            <span className="text-sm text-slate-300">Loading models...</span>
          </div>
        )}
        {saved && (
          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center">
            <CheckCircle2 size={64} className="text-green-400" />
          </div>
        )}
      </div>

      <p
        className={`mb-6 text-center text-sm ${saved ? "text-green-400" : "text-slate-400"}`}
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

      <a
        href="/"
        className="mt-8 text-slate-500 hover:text-slate-300 text-sm transition"
      >
        ← Back to game
      </a>
    </div>
  );
}
