import { useRef, useEffect } from "react";

interface AudioWaveformProps {
  analyserNode: AnalyserNode | null;
  isPaused: boolean;
  isRecording: boolean;
  width?: number;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barColor?: string;
}

export function AudioWaveform({
  analyserNode,
  isPaused,
  isRecording,
  width = 300,
  height = 60,
  barWidth = 4,
  barGap = 2,
  barColor = "#101828",
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Main effect to handle visualization
  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvasCtx.scale(dpr, dpr);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get actual data from the analyser if we're recording
    if (isRecording) {
      analyserNode.getByteFrequencyData(dataArray);
    } else {
      // Generate sample data for non-recording state
      for (let i = 0; i < bufferLength; i++) {
        // Generate random values for a nice static waveform
        dataArray[i] = Math.floor(Math.random() * 40) + 10;
      }
    }

    // This function draws bars based on the current dataArray
    const drawBars = () => {
      // Clear canvas
      canvasCtx.clearRect(0, 0, width, height);

      // Calculate how many bars we can fit
      const totalBarWidth = barWidth + barGap;
      const numBars = Math.min(Math.floor(width / totalBarWidth), bufferLength);
      const step = Math.ceil(bufferLength / numBars);

      // Draw each bar
      for (let i = 0; i < numBars; i++) {
        // Average a few values for smoother visualization
        let sum = 0;
        let count = 0;
        for (let j = 0; j < step && i * step + j < bufferLength; j++) {
          sum += dataArray[i * step + j];
          count++;
        }
        const value = count > 0 ? sum / count : 0;

        // Convert value (0-255) to bar height
        const barHeight = (value / 255) * height;

        // Center the bars vertically
        const x = i * totalBarWidth;
        const y = height - barHeight;

        // Draw the bar
        canvasCtx.fillStyle = barColor;
        canvasCtx.fillRect(x, y, barWidth, barHeight);
      }
    };

    // The animation function
    const animate = () => {
      // Only update data if we're recording and not paused
      if (isRecording && !isPaused) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      drawBars();

      // Only continue animation if we're recording
      if (isRecording) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Draw initial visualization
    drawBars();

    // Start animation loop only if recording
    if (isRecording) {
      animationRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [
    analyserNode,
    barColor,
    barGap,
    barWidth,
    height,
    isPaused,
    isRecording,
    width,
  ]);

  // When isRecording changes from true to false, explicitly cancel animations
  useEffect(() => {
    if (!isRecording && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "block",
      }}
    />
  );
}
