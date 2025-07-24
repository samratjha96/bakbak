import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { PlayIcon, BackIcon, DocumentIcon } from "~/components/ui/Icons";

export const TranscriptionScreen: React.FC = () => {
  // In a real application, we'd fetch the transcription data for the current recording
  const [transcription, setTranscription] = React.useState(
    "こんにちは、私の名前はアレックスです。日本語を勉強しています。よろしくお願いします。",
  );

  const romanization =
    "Konnichiwa, watashi no namae wa Arekkusu desu. Nihongo wo benkyou shiteimasu. Yoroshiku onegaishimasu.";

  return (
    <Layout>
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transcription</h2>
          {/* Desktop back button */}
          <Link
            to="/dashboard"
            className="hidden md:flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <BackIcon className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
        </div>

        <textarea
          className="w-full min-h-[120px] p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(99,102,241,0.1)] mb-2 resize-none"
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
        />

        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-500 dark:text-gray-400 mb-6">
          {romanization}
        </div>

        <div className="flex items-center mb-6">
          <button className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <PlayIcon className="w-5 h-5 text-primary" />
            Play Recording (1:24)
          </button>
        </div>

        {/* Desktop Add Notes button */}
        <div className="hidden md:flex justify-end">
          <Link
            to="/notes"
            className="flex items-center gap-2 py-2 px-6 bg-primary text-white font-medium rounded-lg hover:bg-secondary transition-colors"
          >
            <DocumentIcon className="w-4 h-4" />
            Add Notes
          </Link>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden">
        <ActionBar
          secondaryAction={{
            label: "Dashboard",
            icon: <BackIcon className="w-4 h-4" />,
            to: "/dashboard",
          }}
          primaryAction={{
            label: "Add Notes",
            icon: <DocumentIcon className="w-4 h-4" />,
            to: "/notes",
            primary: true,
          }}
        />
      </div>
    </Layout>
  );
};
