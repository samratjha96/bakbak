import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export class QueryInvalidator {
  constructor(private queryClient: QueryClient) {}

  // Recording-related invalidations
  recording = {
    // Invalidate a specific recording and all its related data
    detail: (recordingId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.recordings.detail(recordingId) 
      });
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcriptions.detail(recordingId) 
      });
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.translations.detail(recordingId) 
      });
    },
    
    // Invalidate recordings list and workspace recordings
    lists: (workspaceId?: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.recordings.lists() 
      });
      if (workspaceId) {
        this.queryClient.invalidateQueries({ 
          queryKey: queryKeys.workspaces.recordings(workspaceId) 
        });
      }
    },
    
    // Complete invalidation after recording operations
    afterCreate: (workspaceId?: string) => {
      this.recording.lists(workspaceId);
    },
    
    afterUpdate: (recordingId: string, workspaceId?: string) => {
      this.recording.detail(recordingId);
      this.recording.lists(workspaceId);
    },
    
    afterDelete: (workspaceId?: string) => {
      this.recording.lists(workspaceId);
    },
  };

  // Transcription-related invalidations
  transcription = {
    afterStart: (recordingId: string, workspaceId?: string) => {
      this.recording.detail(recordingId);
      this.recording.lists(workspaceId);
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcriptions.status(recordingId) 
      });
    },
    
    afterComplete: (recordingId: string, workspaceId?: string) => {
      this.recording.detail(recordingId);
      this.recording.lists(workspaceId);
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcriptions.detail(recordingId) 
      });
    },
    
    afterUpdate: (recordingId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.transcriptions.detail(recordingId) 
      });
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.recordings.detail(recordingId) 
      });
    },
  };

  // Translation-related invalidations
  translation = {
    afterCreate: (recordingId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.translations.detail(recordingId) 
      });
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.recordings.detail(recordingId) 
      });
    },
    
    afterUpdate: (recordingId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.translations.detail(recordingId) 
      });
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.recordings.detail(recordingId) 
      });
    },
  };
}

// Hook for easy access
export const useQueryInvalidator = () => {
  const queryClient = useQueryClient();
  return new QueryInvalidator(queryClient);
};