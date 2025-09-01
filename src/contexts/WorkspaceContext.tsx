import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  userRole?: "owner" | "editor" | "viewer";
}

interface WorkspaceContextType {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (workspaceId: string) => void;
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Prioritize personal workspace when workspaces are set
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      const personalWorkspace = workspaces.find((w) =>
        w.name.includes("Personal Workspace"),
      );
      const selectedWorkspaceId = personalWorkspace?.id || workspaces[0]?.id;
      if (selectedWorkspaceId) {
        setCurrentWorkspaceId(selectedWorkspaceId);
      }
    }
  }, [workspaces, currentWorkspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspaceId,
        setCurrentWorkspaceId,
        workspaces,
        setWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
