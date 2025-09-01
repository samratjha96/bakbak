import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useSession, signOut, signIn } from "~/lib/auth-client";
import { MicrophoneIcon } from "~/components/ui/Icons";
import { WorkspaceSelector } from "~/components/workspace";
import { useQuery } from "@tanstack/react-query";
import { userWorkspacesQuery } from "~/lib/workspaceQueries";

interface HeaderProps {}

export const Header: React.FC<HeaderProps> = () => {
  const { data } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState<string>();

  // Fetch user workspaces using TanStack Query
  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
  } = useQuery({
    ...userWorkspacesQuery(),
    enabled: !!data?.user,
  });

  // Set first workspace as current if none selected
  React.useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId]);

  return (
    <header className="bg-white dark:bg-gray-950 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-primary gap-2">
              <MicrophoneIcon className="w-6 h-6" />
              <span className="hidden sm:inline font-medium">BakBak</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Workspace Selector - shown when logged in */}
            {data?.user && !workspacesLoading && workspaces.length > 0 && (
              <WorkspaceSelector
                workspaces={workspaces}
                currentWorkspaceId={currentWorkspaceId}
                onWorkspaceChange={setCurrentWorkspaceId}
              />
            )}
            
            {/* Record CTA - desktop */}
            <Link
              to="/recordings/new"
              className="hidden md:inline-flex items-center gap-2 py-1.5 px-3 bg-primary hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors"
            >
              <MicrophoneIcon className="w-4 h-4" />
              Record
            </Link>
            {/* User account section - responsive */}
            <div>
              {data ? (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-sm font-medium">
                    {data.user?.name?.split(" ")[0]}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="py-1.5 px-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn.social({ provider: "google" })}
                  className="py-1.5 px-4 bg-primary hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu button - only visible on small screens */}
            <button
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/recordings"
                preload={false}
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/recordings/new"
                preload={false}
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Record
              </Link>
              <Link
                to="/transcribe"
                preload={false}
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Transcribe
              </Link>
              <Link
                to="/recordings"
                preload={false}
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Notes
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
