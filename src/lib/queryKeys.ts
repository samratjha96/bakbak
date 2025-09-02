const baseKeys = {
  all: ['queries'] as const,
} as const;

export const queryKeys = {
  // Root keys
  all: baseKeys.all,
  
  // Recordings
  recordings: {
    all: [...baseKeys.all, 'recordings'] as const,
    lists: () => [...baseKeys.all, 'recordings', 'list'] as const,
    list: (filters?: string) => [...baseKeys.all, 'recordings', 'list', filters] as const,
    details: () => [...baseKeys.all, 'recordings', 'detail'] as const,
    detail: (id: string) => [...baseKeys.all, 'recordings', 'detail', id] as const,
    presignedUrl: (id: string) => [...baseKeys.all, 'recordings', 'detail', id, 'presignedUrl'] as const,
  },
  
  // Transcriptions  
  transcriptions: {
    all: [...baseKeys.all, 'transcriptions'] as const,
    details: () => [...baseKeys.all, 'transcriptions', 'detail'] as const,
    detail: (recordingId: string) => [...baseKeys.all, 'transcriptions', 'detail', recordingId] as const,
    status: (recordingId: string) => [...baseKeys.all, 'transcriptions', 'detail', recordingId, 'status'] as const,
  },
  
  // Translations
  translations: {
    all: [...baseKeys.all, 'translations'] as const,
    details: () => [...baseKeys.all, 'translations', 'detail'] as const,
    detail: (recordingId: string) => [...baseKeys.all, 'translations', 'detail', recordingId] as const,
  },
  
  // Workspaces
  workspaces: {
    all: [...baseKeys.all, 'workspaces'] as const,
    lists: () => [...baseKeys.all, 'workspaces', 'list'] as const,
    userList: () => [...baseKeys.all, 'workspaces', 'list', 'user'] as const,
    details: () => [...baseKeys.all, 'workspaces', 'detail'] as const,
    detail: (id: string) => [...baseKeys.all, 'workspaces', 'detail', id] as const,
    recordings: (id: string) => [...baseKeys.all, 'workspaces', 'detail', id, 'recordings'] as const,
  },
} as const;