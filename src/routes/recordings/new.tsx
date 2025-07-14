import { createFileRoute } from "@tanstack/react-router";
import * as React from 'react';
import { Layout } from '~/components/layout';
import { ActionBar } from '~/components/layout';
import { RecordIcon, PlayIcon, CloseIcon, SaveIcon } from '~/components/ui/Icons';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRecording, formatDuration } from "~/utils/recordings";


function NewRecordingPage() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [timer, setTimer] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [language, setLanguage] = React.useState('ja');
  const [initialNotes, setInitialNotes] = React.useState('');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Timer ref for cleanup
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const startRecording = () => {
    setIsRecording(true);
    setTimer(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };
  
  const stopRecording = () => {
    setIsRecording(false);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Format timer as MM:SS
  const formattedTime = formatDuration(timer);
  
  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Mutation to create a new recording
  const createRecordingMutation = useMutation({
    mutationFn: createRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      navigate({ to: '/recordings' });
    }
  });

  const handleSave = () => {
    // Create a new recording
    createRecordingMutation.mutate({
      data: {
        title: title || 'Untitled Recording',
        language,
        duration: timer,
        audioUrl: '', // In a real app, we would save the audio file
        notes: initialNotes ? {
          content: initialNotes,
          vocabulary: [],
        } : undefined,
      }
    });
  };
  
  // Action bar for both mobile and desktop
  const actionBar = (
    <ActionBar
      secondaryAction={{
        label: 'Cancel',
        icon: <CloseIcon className="w-4 h-4" />,
        to: '/recordings',
      }}
      primaryAction={{
        label: 'Save Recording',
        icon: <SaveIcon className="w-4 h-4" />,
        onClick: handleSave,
        primary: true
      }}
    />
  );
  
  return (
    <Layout
      actionBarContent={actionBar}
    >
      {/* Main content container with max-width constraint and centered horizontally */}
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-6xl">
        {/* Header - visible on all screen sizes */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-semibold">New Recording</h1>
          <p className="text-gray-500 dark:text-gray-400">Record your language practice session</p>
        </div>
        
        {/* Main content section */}
        <div className="max-w-3xl mx-auto">
          {/* Recording section */}
          <div>
            {/* Recording visualizer and controls */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6 mb-6">
              {/* Waveform container with fixed aspect ratio */}
              <div className="relative w-full aspect-[4/1] mb-6 flex items-center justify-center">
                {/* Waveform placeholder */}
                <div className="w-full h-10 md:h-16 bg-gradient-to-b from-gray-300 to-gray-300 dark:from-gray-700 dark:to-gray-700 bg-[length:100%_20%,100%_20%,100%_20%] bg-[position:0_0,0_50%,0_100%] bg-no-repeat opacity-50 rounded" />
                
                {/* Active waveform - centered absolutely */}
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex gap-1 md:gap-2">
                      {[...Array(10)].map((_, i) => (
                        <div 
                          key={i}
                          className="w-[3px] md:w-[4px] h-[10px] bg-primary rounded-sm"
                          style={{ 
                            animation: 'waveform 0.5s infinite alternate',
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                {/* Recording controls - centered flex layout */}
                <div className="flex items-center justify-center gap-6 md:gap-8 mb-4">
                  <button className="btn flex-none">
                    <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                  <button 
                    className={`btn flex-none ${isRecording 
                      ? 'bg-error text-white hover:bg-red-600' 
                      : 'bg-white dark:bg-gray-800 shadow-md'
                    } p-4 md:p-6 rounded-full shadow-md hover:shadow-lg transition-all`}
                    onClick={toggleRecording}
                  >
                    <RecordIcon className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                  <button className="btn flex-none">
                    <PlayIcon className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                </div>
                
                {/* Timer - prominent and centered */}
                <div className="text-lg md:text-xl font-medium text-gray-700 dark:text-gray-300">
                  {formattedTime}
                </div>
              </div>
            </div>
            
            {/* Recording details form */}
            <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-4">Recording Details</h2>
              
              <div className="space-y-5">
                {/* Title field */}
                <div className="form-group">
                  <label htmlFor="recording-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    id="recording-title"
                    type="text"
                    className="w-full h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
                    placeholder="Enter recording title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                {/* Language selector */}
                <div className="form-group">
                  <label htmlFor="recording-language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    id="recording-language"
                    className="w-full h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Mandarin</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                
                {/* Notes textarea */}
                <div className="form-group">
                  <label htmlFor="recording-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="recording-notes"
                    className="w-full min-h-[120px] p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 resize-none"
                    placeholder="Add any notes about this recording..."
                    value={initialNotes}
                    onChange={(e) => setInitialNotes(e.target.value)}
                  ></textarea>
                </div>
                
                {/* Desktop action buttons - right aligned */}
                <div className="hidden lg:flex justify-end gap-4 mt-6">
                  <button 
                    className="py-2.5 px-5 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => navigate({ to: '/recordings' })}
                  >
                    Cancel
                  </button>
                  <button 
                    className={`py-2.5 px-5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors ${createRecordingMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleSave}
                    disabled={createRecordingMutation.isPending}
                  >
                    Save Recording
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/recordings/new")({
  component: NewRecordingPage,
});