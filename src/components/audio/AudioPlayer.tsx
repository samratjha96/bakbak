import * as React from "react";
import { PlayIcon, PauseIcon } from "~/components/ui/Icons";

interface AudioPlayerProps {
  url?: string;
  onFetchUrl: () => Promise<string | { url: string; directUrl?: string }>;
  className?: string;
}

type PlayerMode = "hidden" | "visible" | "none";

export function AudioPlayer({
  url: initialUrl,
  onFetchUrl,
  className = "",
}: AudioPlayerProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playerMode, setPlayerMode] = React.useState<PlayerMode>("none");
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Set up event listeners for the audio element
  React.useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("ended", handleEnded);

    return () => {
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("ended", handleEnded);
    };
  }, [playerMode]); // Only when player mode changes

  const handlePlay = async () => {
    // Toggle play/pause if already set up
    if (playerMode !== "none" && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (err) {
          handlePlaybackError(err);
        }
      }
      return;
    }

    // First time - fetch URL and create player
    setIsLoading(true);
    setError(null);

    try {
      const urlResponse = await onFetchUrl();
      const url =
        typeof urlResponse === "string" ? urlResponse : urlResponse.url;

      setAudioUrl(url);
      setPlayerMode("hidden");

      // Play when available
      if (audioRef.current) {
        try {
          await audioRef.current.play();
        } catch (err) {
          handlePlaybackError(err);
        }
      }
    } catch (err) {
      setError("Failed to load audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaybackError = (err: any) => {
    // Show visible player on autoplay restriction
    if (err.name === "NotAllowedError") {
      setPlayerMode("visible");
    } else {
      setError("Failed to play audio. Please try again.");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        onClick={handlePlay}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        ) : isPlaying ? (
          <PauseIcon className="w-5 h-5 text-primary" />
        ) : (
          <PlayIcon className="w-5 h-5 text-primary" />
        )}
        {isPlaying ? "Pause" : "Play"} Recording
      </button>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {/* Audio element - conditionally visible */}
      {playerMode !== "none" && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls={playerMode === "visible"}
          style={{ display: playerMode === "visible" ? "block" : "none" }}
          className={playerMode === "visible" ? "mt-2" : ""}
          onError={() => {
            setError("Failed to play audio format. Please try again.");
            setPlayerMode("visible");
          }}
        />
      )}
    </div>
  );
}
