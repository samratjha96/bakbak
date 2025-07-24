import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Layout } from "~/components/layout";
import {
  MicrophoneIcon,
  DocumentIcon,
  TranslateIcon,
  LightbulbIcon,
} from "~/components/ui/Icons";

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title }) => (
  <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded text-center">
    <div className="w-10 h-10 mx-auto mb-3">{icon}</div>
    <h3 className="text-sm font-semibold">{title}</h3>
  </div>
);

export const LandingScreen: React.FC = () => {
  return (
    <Layout hideNavigation hideFooter>
      <div className="container">
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center mb-6">
            <MicrophoneIcon className="w-12 h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Learn Languages Through Speaking
          </h1>
          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8 max-w-md">
            Record, transcribe, and study your language practice with powerful
            AI assistance
          </p>

          <div className="flex gap-4">
            <Link to="/dashboard" className="btn-lg btn-primary">
              Get Started
            </Link>
            <button className="btn-lg btn-outline">Learn More</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 my-10">
          <FeatureItem
            icon={<MicrophoneIcon className="w-full h-full text-primary" />}
            title="Voice Recording"
          />
          <FeatureItem
            icon={<DocumentIcon className="w-full h-full text-primary" />}
            title="AI Transcription"
          />
          <FeatureItem
            icon={<TranslateIcon className="w-full h-full text-primary" />}
            title="Romanization"
          />
          <FeatureItem
            icon={<LightbulbIcon className="w-full h-full text-primary" />}
            title="Learn Faster"
          />
        </div>
      </div>
    </Layout>
  );
};
