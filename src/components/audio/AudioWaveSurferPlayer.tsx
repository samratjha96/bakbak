import * as React from "react";
import WaveSurfer from "wavesurfer.js";
import { PlayIcon, PauseIcon } from "~/components/ui/Icons";

interface AudioWaveSurferPlayerProps {
  url: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export const AudioWaveSurferPlayer: React.FC<AudioWaveSurferPlayerProps> = ({
  url,
  className = "",
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const waveSurferRef = React.useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#E5E7EB", // gray-200
      progressColor: "#6366F1", // indigo-500
      cursorColor: "#9CA3AF", // gray-400
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      minPxPerSec: 10,
    });

    waveSurferRef.current = ws;

    const onReady = () => {
      setIsReady(true);
      setDuration(ws.getDuration());
    };
    const onTimeUpdate = (t: number) => setCurrentTime(t);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = (e: any) => {
      console.error("WaveSurfer error loading audio:", e);
      setIsReady(false);
    };

    ws.on("ready", onReady);
    ws.on("timeupdate", onTimeUpdate);
    ws.on("play", onPlay);
    ws.on("pause", onPause);
    ws.on("error", onError);

    ws.load(url);

    return () => {
      ws.un("ready", onReady);
      ws.un("timeupdate", onTimeUpdate);
      ws.un("play", onPlay);
      ws.un("pause", onPause);
      ws.un("error", onError);
      ws.destroy();
      waveSurferRef.current = null;
    };
  }, [url]);

  const togglePlay = async () => {
    if (!waveSurferRef.current || !isReady) return;
    waveSurferRef.current.playPause();
  };

  return (
    <div className={`w-full ${className}`}>
      <div ref={containerRef} className="w-full" />

      <div className="mt-3 flex items-center justify-between">
        <button
          className="flex items-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          onClick={togglePlay}
          disabled={!isReady}
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5 text-primary" />
          ) : (
            <PlayIcon className="w-5 h-5 text-primary" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
