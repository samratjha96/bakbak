import React, { useState } from "react";
import { Link } from "@tanstack/react-router";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  userRole?: "owner" | "editor" | "viewer";
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSelector({ 
  workspaces, 
  currentWorkspaceId, 
  onWorkspaceChange 
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {currentWorkspace?.name.charAt(0) || "W"}
          </span>
        </div>
        <span className="max-w-32 truncate">
          {currentWorkspace?.name || "Select Workspace"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-50 w-64 mt-2 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your Workspaces
              </div>
              
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => {
                    onWorkspaceChange?.(workspace.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                    workspace.id === currentWorkspaceId ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">
                      {workspace.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{workspace.name}</div>
                    <div className="text-xs text-gray-500">
                      {workspace.userRole} • {workspace.memberCount || 0} member{workspace.memberCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {workspace.id === currentWorkspaceId && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              
              <hr className="my-1" />
              
              <Link
                to="/workspace/new"
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Create workspace</div>
                  <div className="text-xs text-gray-500">New shared space</div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}