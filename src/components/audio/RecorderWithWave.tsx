import * as React from "react";
import { AudioRecorder, useAudioRecorder as useExternalRecorder } from "react-audio-voice-recorder";

interface RecorderWithWaveProps {
  onRecordingComplete: (blob: Blob) => void;
  className?: string;
}

export const RecorderWithWave: React.FC<RecorderWithWaveProps> = ({
  onRecordingComplete,
  className = "",
}) => {
  // The library exposes an internal hook if we want to control externally
  const recorderControls = useExternalRecorder();

  return (
    <div className={className}>
      <AudioRecorder
        onRecordingComplete={onRecordingComplete}
        recorderControls={recorderControls}
        downloadOnSave={false}
        showVisualizer={true}
        classes={{
          audioTrack: "w-full",
        }}
      />
    </div>
  );
};
