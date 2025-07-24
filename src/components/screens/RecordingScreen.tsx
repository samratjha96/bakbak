import * as React from "react";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import {
  RecordIcon,
  PlayIcon,
  CloseIcon,
  SaveIcon,
} from "~/components/ui/Icons";

// Sidebar component for desktop
const RecordingSidebar: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="font-semibold text-lg mb-4">Tips for Recording</h2>

      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-200">
            Find a quiet environment
          </h3>
          <p>
            Record in a quiet place with minimal background noise for the best
            transcription results.
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-200">
            Speak clearly
          </h3>
          <p>
            Try to enunciate words clearly but maintain a natural speaking pace.
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-200">
            Keep microphone distance consistent
          </h3>
          <p>
            Keep a consistent distance from your microphone throughout the
            recording.
          </p>
        </div>
      </div>
    </div>
  );
};

export const RecordingScreen: React.FC = () => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [timer, setTimer] = React.useState(0);
  const [title, setTitle] = React.useState("");

  // Timer ref for cleanup
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setTimer(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Format timer as MM:SS
  const formattedTime = React.useMemo(() => {
    const minutes = Math.floor(timer / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (timer % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timer]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Action bar for both mobile and desktop
  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Cancel",
        icon: <CloseIcon className="w-4 h-4" />,
        to: "/dashboard",
      }}
      primaryAction={{
        label: "Save & Transcribe",
        icon: <SaveIcon className="w-4 h-4" />,
        to: "/transcribe",
        primary: true,
      }}
    />
  );

  return (
    <Layout actionBarContent={actionBar} sidebarContent={<RecordingSidebar />}>
      <div className="container">
        {/* Header - visible on all screen sizes */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">New Recording</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Record your language practice session
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6 text-center">
          <div className="relative h-[60px] md:h-[100px] flex items-center justify-center mb-4">
            {/* Waveform placeholder */}
            <div className="w-full h-10 md:h-16 bg-gradient-to-b from-gray-300 to-gray-300 dark:from-gray-700 dark:to-gray-700 bg-[length:100%_20%,100%_20%,100%_20%] bg-[position:0_0,0_50%,0_100%] bg-no-repeat opacity-50 rounded" />

            {/* Active waveform */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-1 md:gap-2">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] md:w-[4px] h-[10px] bg-primary rounded-sm"
                      style={{
                        animation: "waveform 0.5s infinite alternate",
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recording controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button className="btn">
              <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
              className={`btn ${
                isRecording
                  ? "bg-error text-white hover:bg-red-600"
                  : "bg-white dark:bg-gray-800 shadow-md"
              } p-4 md:p-6`}
              onClick={toggleRecording}
            >
              <RecordIcon className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button className="btn">
              <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </div>

          {/* Timer */}
          <div className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400">
            {formattedTime}
          </div>
        </div>

        {/* Recording details */}
        <div className="mb-8 lg:mb-0">
          <h2 className="text-lg font-semibold mb-3">Recording Details</h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="recording-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title
              </label>
              <input
                id="recording-title"
                type="text"
                className="w-full min-h-[50px] p-4 border border-gray-200 dark:border-gray-800 rounded text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)]"
                placeholder="Enter recording title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Optional additional fields for desktop */}
            <div className="hidden md:block">
              <label
                htmlFor="recording-language"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <select
                id="recording-language"
                className="w-full h-[50px] px-4 border border-gray-200 dark:border-gray-800 rounded text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)]"
              >
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Mandarin</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            <div className="hidden lg:block">
              <label
                htmlFor="recording-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes (Optional)
              </label>
              <textarea
                id="recording-notes"
                className="w-full min-h-[100px] p-4 border border-gray-200 dark:border-gray-800 rounded text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] resize-none"
                placeholder="Add any notes about this recording..."
              ></textarea>
            </div>

            {/* Desktop action buttons */}
            <div className="hidden lg:flex justify-end gap-4 mt-8">
              <button
                className="py-2 px-4 border border-gray-200 dark:border-gray-800 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => {}}
              >
                Cancel
              </button>
              <button
                className="py-2 px-4 bg-primary text-white rounded hover:bg-secondary transition-colors"
                onClick={() => {}}
              >
                Save & Transcribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Add keyframe animation to the stylesheet
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes waveform {
      0% { height: 10px; }
      100% { height: 40px; }
    }
  `;
  document.head.appendChild(style);
}
