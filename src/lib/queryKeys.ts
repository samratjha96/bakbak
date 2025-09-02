const baseKeys = {
  all: ['queries'] as const,
} as const;

export const queryKeys = {
  // Root keys
  all: baseKeys.all,
  
  // Recordings
  recordings: {
    all: [...baseKeys.all, 'recordings'] as const,
    lists: () => ['recordings'] as const,
    list: (filters?: string) => ['recordings', filters] as const,
    details: () => [...baseKeys.all, 'recordings', 'detail'] as const,
    detail: (id: string) => ['recording', id] as const,
    presignedUrl: (id: string) => ['recording', id, 'presignedUrl'] as const,
  },
  
  // Transcriptions  
  transcriptions: {
    all: [...baseKeys.all, 'transcriptions'] as const,
    details: () => [...baseKeys.all, 'transcriptions', 'detail'] as const,
    detail: (recordingId: string) => ['transcription', recordingId] as const,
    status: (recordingId: string) => ['transcription', 'status', recordingId] as const,
  },
  
  // Translations
  translations: {
    all: [...baseKeys.all, 'translations'] as const,
    details: () => [...baseKeys.all, 'translations', 'detail'] as const,
    detail: (recordingId: string) => ['translation', recordingId] as const,
  },
  
  // Workspaces
  workspaces: {
    all: [...baseKeys.all, 'workspaces'] as const,
    lists: () => [...baseKeys.all, 'workspaces', 'list'] as const,
    userList: () => ['workspaces', 'user'] as const,
    details: () => [...baseKeys.all, 'workspaces', 'detail'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    recordings: (id: string) => ['workspaces', id, 'recordings'] as const,
  },
} as const;