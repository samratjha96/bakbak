import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  updateRecordingNotes, 
  updateRecording, 
  getRecordingPresignedUrl 
} from "~/lib/recordings";
import { formatDuration, formatDateLong } from "~/utils/formatting";
import { useQueryInvalidator } from "~/lib/queryInvalidation";
import { queryKeys } from "~/lib/queryKeys";

interface Recording {
  id: string;
  title?: string;
  notes?: { content?: string };
  duration: number;
  createdAt: Date;
}

export function useRecordingDetails(recordingId: string, recording: Recording) {
  const queryClient = useQueryClient();
  const invalidator = useQueryInvalidator();

  // Form state management
  const [notesContent, setNotesContent] = useState(recording?.notes?.content || "");
  const [title, setTitle] = useState(recording?.title || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  // Sync with recording data changes
  useEffect(() => {
    if (recording) {
      setNotesContent(recording.notes?.content || "");
      setTitle(recording.title || "");
    }
  }, [recording]);

  // Computed values
  const formattedDuration = useMemo(() => formatDuration(recording.duration), [recording.duration]);
  const formattedDate = useMemo(() => formatDateLong(recording.createdAt), [recording.createdAt]);

  // Presigned URL fetch function with caching
  const fetchPresignedUrl = useCallback(async (): Promise<
    string | { url: string; directUrl?: string }
  > => {
    // Try to get from cache first
    const cachedData = queryClient.getQueryData<any>([
      "recording",
      recordingId,
      "presignedUrl",
    ]);

    // Return cached data if valid and not expired
    if (cachedData && cachedData.url) {
      return cachedData as {
        url: string;
        directUrl?: string;
        expiresAt?: string;
      };
    }

    try {
      // Fetch new URL if not cached or expired
      const result = await getRecordingPresignedUrl({ data: recordingId });

      // Cache the result
      queryClient.setQueryData(["recording", recordingId, "presignedUrl"], result);

      return result as { url: string; directUrl?: string };
    } catch (error) {
      console.error("Error fetching presigned URL:", error);
      throw error;
    }
  }, [recordingId, queryClient]);

  // Notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notesData: {
      id: string;
      notes: { content: string };
    }) => {
      try {
        return await updateRecordingNotes({ data: notesData });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save notes. Please try again.";
        throw new Error(message);
      }
    },
    onMutate: async (notesData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
      
      // Snapshot the previous value
      const previousRecording = queryClient.getQueryData(queryKeys.recordings.detail(recordingId));
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.recordings.detail(recordingId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          notes: {
            content: notesData.notes.content,
            lastUpdated: new Date(),
          }
        };
      });
      
      // Also update recordings list cache if it exists
      queryClient.setQueryData(queryKeys.recordings.lists(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((r: any) => 
          r.id === recordingId 
            ? { 
                ...r, 
                notes: { 
                  content: notesData.notes.content, 
                  lastUpdated: new Date() 
                } 
              }
            : r
        );
      });
      
      return { previousRecording };
    },
    onError: (err, notesData, context) => {
      // Rollback on error
      if (context?.previousRecording) {
        queryClient.setQueryData(queryKeys.recordings.detail(recordingId), context.previousRecording);
      }
    },
    onSuccess: () => {
      invalidator.recording.afterUpdate(recordingId);
      setEditingNotes(false);
    },
    onSettled: () => {
      // Always refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
    },
  });

  // Title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (recordingData: { id: string; title: string }) => {
      try {
        return await updateRecording({ data: recordingData });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save title. Please try again.";
        throw new Error(message);
      }
    },
    onMutate: async (recordingData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
      
      // Snapshot the previous value
      const previousRecording = queryClient.getQueryData(queryKeys.recordings.detail(recordingId));
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.recordings.detail(recordingId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          title: recordingData.title,
        };
      });
      
      // Also update recordings list cache if it exists
      queryClient.setQueryData(queryKeys.recordings.lists(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((r: any) => 
          r.id === recordingId 
            ? { ...r, title: recordingData.title }
            : r
        );
      });
      
      return { previousRecording };
    },
    onError: (err, recordingData, context) => {
      // Rollback on error
      if (context?.previousRecording) {
        queryClient.setQueryData(queryKeys.recordings.detail(recordingId), context.previousRecording);
      }
    },
    onSuccess: () => {
      invalidator.recording.afterUpdate(recordingId);
      setEditingTitle(false);
    },
    onSettled: () => {
      // Always refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.recordings.detail(recordingId) });
    },
  });

  // Action handlers
  const handleSaveNotes = useCallback(() => {
    updateNotesMutation.mutate({
      id: recordingId,
      notes: {
        content: notesContent,
      },
    });
  }, [recordingId, notesContent, updateNotesMutation]);

  const handleSaveTitle = useCallback(() => {
    updateTitleMutation.mutate({
      id: recordingId,
      title,
    });
  }, [recordingId, title, updateTitleMutation]);

  return {
    // State
    notesContent,
    setNotesContent,
    title,
    setTitle,
    editingNotes,
    setEditingNotes,
    editingTitle,
    setEditingTitle,
    
    // Computed
    formattedDuration,
    formattedDate,
    
    // Actions
    handleSaveNotes,
    handleSaveTitle,
    fetchPresignedUrl,
    
    // Mutations
    updateNotesMutation,
    updateTitleMutation,
  };
}