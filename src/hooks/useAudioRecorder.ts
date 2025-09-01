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
  const isPausedRef = useRef<boolean>(false);
  const TIMESLICE_MS = 500; // collect chunks periodically to support manual pause

  // Cleanup function to stop all media recording
  const cleanup = useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Revoke object URL to prevent memory leaks
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
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
  }, [audioUrl]);

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

      // Prefer a widely supported audio mime type
      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const supportedMimeType = preferredMimeTypes.find((type) => {
        // Some older browsers may not implement isTypeSupported
        try {
          const MR: any = MediaRecorder as any;
          return (
            typeof MR !== "undefined" &&
            typeof MR.isTypeSupported === "function" &&
            MR.isTypeSupported(type)
          );
        } catch {
          return false;
        }
      });

      let mediaRecorder;
      if (supportedMimeType) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: supportedMimeType,
        });
      } else {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        // Only keep chunks when not paused (works even if native pause isn't supported)
        if (event.data.size > 0 && !isPausedRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const firstChunkType = audioChunksRef.current[0]?.type;
        const mimeType =
          firstChunkType || mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });
        const url = URL.createObjectURL(audioBlob);

        setAudioBlob(audioBlob);
        setAudioUrl(url);
        setIsRecording(false);
      };

      // Start recording with a timeslice so we can drop chunks while "paused"
      mediaRecorder.start(TIMESLICE_MS);
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
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
      isPausedRef.current = true;

      // Suspend processing/visualization to save CPU, but keep tracks enabled so recorder stays alive
      try {
        audioContextRef.current?.suspend().catch(() => {});
      } catch (_) {}

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      // Fallback: keep recorder running but drop chunks while paused
      setIsPaused(true);
      isPausedRef.current = true;
      try {
        audioContextRef.current?.suspend().catch(() => {});
      } catch (_) {}
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
      isPausedRef.current = false;

      // Resume processing/visualization
      try {
        audioContextRef.current?.resume().catch(() => {});
      } catch (_) {}

      // Resume timer
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } else if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      // Fallback resume: simply start accepting chunks again
      setIsPaused(false);
      isPausedRef.current = false;
      try {
        audioContextRef.current?.resume().catch(() => {});
      } catch (_) {}
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    }
  }, []);

  // Reset recording
  const resetRecording = useCallback(() => {
    // Revoke previous URL before cleanup
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    cleanup();
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    isPausedRef.current = false;
    audioChunksRef.current = [];
  }, [cleanup, audioUrl]);

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
