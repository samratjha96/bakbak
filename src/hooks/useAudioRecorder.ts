import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  analyserNode: AnalyserNode | null;
  error: Error | null;
}

interface AudioRecorderHook extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

/**
 * Hook for recording audio in the browser using the MediaRecorder API
 */
export function useAudioRecorder(): AudioRecorderHook {
  // State for recording status
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs to store media objects that need to persist between renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to stop all media recording
  const cleanup = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder if active
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
      }
    }

    // Stop all media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
    }

    // Reset states
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset states
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      audioChunksRef.current = [];
      setDuration(0);

      // Get access to the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create audio context and analyser node for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      // Don't connect to destination to avoid feedback
      // analyser.connect(audioContext.destination);

      setAnalyserNode(analyser);

      // Create media recorder with mp3 format
      const options = { mimeType: "audio/mpeg" };

      // Try to create with MP3 format, fallback to browser default if not supported
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log(
          "[useAudioRecorder] Successfully created MediaRecorder with audio/mpeg format",
        );
      } catch (err) {
        console.warn(
          "[useAudioRecorder] audio/mpeg not supported, falling back to browser default:",
          err,
        );
        mediaRecorder = new MediaRecorder(stream);
        console.log(
          `[useAudioRecorder] Using format: ${mediaRecorder.mimeType}`,
        );
      }

      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mpeg",
        });
        const url = URL.createObjectURL(audioBlob);

        setAudioBlob(audioBlob);
        setAudioUrl(url);
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      cleanup();
    }
  }, [cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording" &&
      "pause" in mediaRecorderRef.current // Check if pause is supported
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused" &&
      "resume" in mediaRecorderRef.current // Check if resume is supported
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    }
  }, []);

  // Reset recording
  const resetRecording = useCallback(() => {
    cleanup();
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];
  }, [cleanup]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    analyserNode,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
