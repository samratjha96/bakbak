import { queryOptions } from "@tanstack/react-query";
import {
  fetchUserWorkspaces,
  fetchWorkspaceDetails,
  fetchWorkspaceRecordings,
} from "./workspace";

/**
 * Query for fetching user's workspaces
 */
export const userWorkspacesQuery = () =>
  queryOptions({
    queryKey: ["workspaces", "user"],
    queryFn: () => fetchUserWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

/**
 * Query for fetching workspace details
 */
export const workspaceDetailsQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["workspaces", workspaceId],
    queryFn: () => fetchWorkspaceDetails({ data: { workspaceId } }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

/**
 * Query for fetching workspace recordings
 */
export const workspaceRecordingsQuery = (workspaceId: string) =>
  queryOptions({
    queryKey: ["workspaces", workspaceId, "recordings"],
    queryFn: () => fetchWorkspaceRecordings({ data: { workspaceId } }),
    staleTime: 30 * 1000, // 30 seconds
  });
