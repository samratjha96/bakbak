import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  HomeIcon,
  MicrophoneIcon,
  DocumentIcon,
  TranslateIcon,
  StorageIcon,
} from "~/components/ui/Icons";

interface NavigationProps {
  hide?: boolean;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Recordings",
    to: "/recordings",
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    label: "New Recording",
    to: "/recordings/new",
    icon: <MicrophoneIcon className="w-5 h-5" />,
  },
  {
    label: "Storage",
    to: "/storage",
    icon: <StorageIcon className="w-5 h-5" />,
  },
];

export const Navigation: React.FC<NavigationProps> = ({ hide = false }) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  if (hide) {
    return null;
  }

  return (
    <>
      {/* Desktop and mobile navigation - with icons and labels */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between md:justify-start overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3 sm:px-4 lg:px-8 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex-1 md:flex-none text-center md:text-left ${
                  currentPath === item.to
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                }`}
                activeProps={{
                  className:
                    "flex items-center gap-2 px-3 sm:px-4 lg:px-8 py-3 font-medium border-b-2 border-primary text-primary transition-colors whitespace-nowrap flex-1 md:flex-none text-center md:text-left",
                }}
              >
                <span className="mx-auto md:mx-0">{item.icon}</span>
                <span className="hidden sm:inline ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
