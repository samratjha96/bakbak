import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { MicrophoneIcon, PlusIcon } from "~/components/ui/Icons";
import { useSession } from "~/lib/auth-client";

interface StatCardProps {
  value: string | number;
  label: string;
}

interface RecordingItemProps {
  title: string;
  language: string;
  duration: string;
  date: string;
  onClick: () => void;
}

interface ActivityItemProps {
  text: string;
  time: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label }) => (
  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

const RecordingItem: React.FC<RecordingItemProps> = ({
  title,
  language,
  duration,
  date,
  onClick,
}) => (
  <div
    className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    onClick={onClick}
  >
    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mr-4">
      <MicrophoneIcon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1">
      <div className="font-medium text-gray-900 dark:text-gray-100">
        {title}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap mt-1">
        <span>{language}</span>
        <span className="mx-1.5">•</span>
        <span>{duration}</span>
        <span className="mx-1.5">•</span>
        <span>{date}</span>
      </div>
    </div>
  </div>
);

const ActivityItem: React.FC<ActivityItemProps> = ({ text, time }) => (
  <div className="py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0">
    <div className="mb-1">{text}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
  </div>
);

// Sidebar component for desktop view
const DashboardSidebar: React.FC<{
  activities: { id: string; text: string; time: string }[];
}> = ({ activities }) => {
  return (
    <div className="sticky top-20">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Recent Activity</h2>
        </div>
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            text={activity.text}
            time={activity.time}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to="/record"
          className="flex items-center justify-center gap-2 py-2 px-4 bg-primary text-white font-medium rounded-lg hover:bg-secondary transition-colors"
        >
          <MicrophoneIcon className="w-4 h-4" />
          New Recording
        </Link>
        <button
          className="flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => {}}
        >
          <PlusIcon className="w-4 h-4" />
          Create Folder
        </button>
      </div>
    </div>
  );
};

export const DashboardScreen: React.FC = () => {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "User";

  // Mock data for demonstration
  const recordings = [
    {
      id: "1",
      title: "Daily Conversation Practice",
      language: "Japanese",
      duration: "1:24",
      date: "Today",
    },
    {
      id: "2",
      title: "Restaurant Phrases",
      language: "French",
      duration: "2:38",
      date: "Yesterday",
    },
    {
      id: "3",
      title: "Shopping Vocabulary",
      language: "Korean",
      duration: "3:42",
      date: "2 days ago",
    },
  ];

  const activities = [
    {
      id: "1",
      text: 'You completed a transcription of "Daily Conversation Practice"',
      time: "Today, 2:35 PM",
    },
    {
      id: "2",
      text: 'You recorded "Daily Conversation Practice"',
      time: "Today, 2:30 PM",
    },
    {
      id: "3",
      text: 'You added notes to "Restaurant Phrases"',
      time: "Yesterday, 7:15 PM",
    },
  ];

  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: "Create Folder",
        icon: <PlusIcon className="w-4 h-4" />,
        onClick: () => {},
      }}
      primaryAction={{
        label: "New Recording",
        icon: <MicrophoneIcon className="w-4 h-4" />,
        to: "/record",
        primary: true,
      }}
    />
  );

  return (
    <Layout
      actionBarContent={actionBar}
      sidebarContent={<DashboardSidebar activities={activities} />}
    >
      <div className="container py-4">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-semibold">Hello, {userName}</h1>

          {/* Desktop quick actions, hidden on mobile */}
          <div className="hidden md:block lg:hidden">
            <button className="py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-md text-sm flex items-center">
              <PlusIcon className="w-4 h-4 mr-1.5" />
              Create Folder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard value={28} label="Total Recordings" />
          <StatCard value={12} label="This Week" />
          <StatCard value="3.5h" label="Practice Time" />
          <StatCard value={4} label="Languages" />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Recent Recordings
            </h2>
            <span className="text-xs text-primary font-medium cursor-pointer">
              View All
            </span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {recordings.map((recording, index) => (
              <React.Fragment key={recording.id}>
                {index > 0 && (
                  <div className="mx-4 border-t border-gray-100 dark:border-gray-800"></div>
                )}
                <RecordingItem
                  title={recording.title}
                  language={recording.language}
                  duration={recording.duration}
                  date={recording.date}
                  onClick={() => {}} // Will be linked to transcription page
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Mobile only activity feed, hidden on desktop */}
        <div className="lg:hidden mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Recent Activity
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                text={activity.text}
                time={activity.time}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
