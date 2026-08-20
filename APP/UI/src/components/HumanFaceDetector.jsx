import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  UserCheck,
  Sparkles,
  Eye,
  EyeOff,
  Volume2,
  Scan,
  ShieldCheck,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { loadHumanModels, detectHumanPresence } from "@/services/humanDetectionService";

export default function HumanFaceDetector() {
  const { triggerGreeting, setPersonDetected, setWelcomePlayed, resetVisitorSession, welcomePlayed } = useChat();
  const [isActive, setIsActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [localDetected, setLocalDetected] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [statusText, setStatusText] = useState("Face Sensing Ready");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const absentSinceRef = useRef(null);

  // Sync ref with context welcomePlayed
  useEffect(() => {
    hasGreetedRef.current = welcomePlayed;
  }, [welcomePlayed]);

  // Load HUM models on component mount
  useEffect(() => {
    let mounted = true;
    setStatusText("Loading HUM models...");
    loadHumanModels("/models").then((loaded) => {
      if (mounted) {
        setModelsReady(loaded);
        setStatusText(loaded ? "HUM AI Face Sensor Ready" : "Sensor Ready (Basic)");
      }
    });
    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setStatusText("Requesting webcam access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsActive(true);
      setStatusText("Scanning for visitors...");
      absentSinceRef.current = null;

      // Continuous detection loop every 750ms
      detectionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

        const res = await detectHumanPresence(videoRef.current);
        if (res && res.detected) {
          absentSinceRef.current = null;
          setLocalDetected(true);
          setPersonDetected(true);
          setDetectedInfo(res);
          setStatusText(`Person Detected (${res.honorific})`);

          // Trigger greeting once per visitor session
          if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            setWelcomePlayed(true);
            triggerGreeting(res.honorific || "Sir/Mam");
          }
        } else {
          setLocalDetected(false);
          setPersonDetected(false);
          setDetectedInfo(null);
          setStatusText("Scanning for visitors...");

          // If person is absent for >6 seconds, reset session for the next visitor
          if (hasGreetedRef.current) {
            if (!absentSinceRef.current) {
              absentSinceRef.current = Date.now();
            } else if (Date.now() - absentSinceRef.current > 6000) {
              hasGreetedRef.current = false;
              absentSinceRef.current = null;
              resetVisitorSession();
              console.log("[Visitor Session] Visitor departed. Session reset for next person.");
            }
          }
        }
      }, 750);
    } catch (err) {
      console.warn("Webcam permission denied or error:", err);
      setStatusText("Webcam access optional");
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setLocalDetected(false);
    setPersonDetected(false);
    setDetectedInfo(null);
    setStatusText("Face Sensing Off");
  };

  const toggleSensor = () => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  return (
    <div className="my-4 flex flex-col items-center sm:items-end">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/90 p-2 sm:px-3 sm:py-2 shadow-sm backdrop-blur-md">
        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              localDetected
                ? "bg-emerald-500 animate-ping"
                : isActive
                ? "bg-blue-500 animate-pulse"
                : "bg-slate-300"
            }`}
          />
          <div className="text-xs font-semibold text-slate-700">
            {localDetected ? (
              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                <UserCheck className="h-3.5 w-3.5" />
                {detectedInfo?.honorific ? `${detectedInfo.honorific} Detected` : "Person Standing Before Kiosk"}
              </span>
            ) : isActive ? (
              <span className="text-blue-600 flex items-center gap-1">
                <Scan className="h-3.5 w-3.5 animate-spin-slow" />
                HUM Face Sensing Active
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                Webcam Auto-Greeting Sensor
              </span>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
          <button
            onClick={toggleSensor}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              isActive
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-500 hover:to-indigo-500"
            }`}
          >
            {isActive ? (
              <>
                <CameraOff className="h-3 w-3" /> Stop Sensing
              </>
            ) : (
              <>
                <Camera className="h-3 w-3" /> Turn On Face Sensor
              </>
            )}
          </button>

          {isActive && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={showPreview ? "Hide Camera Thumbnail" : "Show Camera Thumbnail"}
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Video Preview Thumbnail (when active) */}
      <AnimatePresence>
        {isActive && showPreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="relative mt-2 overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-slate-950 shadow-xl shadow-indigo-950/20"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-28 w-36 object-cover -scale-x-100"
            />
            {/* Scanning radar overlay */}
            <div className="pointer-events-none absolute inset-0 border border-indigo-400/30 rounded-2xl" />
            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between rounded-lg bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white backdrop-blur-sm">
              <span className="truncate">
                {localDetected ? `✓ ${detectedInfo?.honorific || "Person"}` : "Scanning..."}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
