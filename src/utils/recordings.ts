import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Recording, Transcription, Notes } from "~/types/recording";

// Mock data for demonstration
const mockRecordings: Recording[] = [
  {
    id: "1",
    title: "Daily Conversation Practice",
    language: "Japanese",
    duration: 84, // 1:24
    createdAt: new Date(),
    transcription: {
      text: "こんにちは、私の名前はアレックスです。日本語を勉強しています。よろしくお願いします。",
      romanization:
        "Konnichiwa, watashi no namae wa Arekkusu desu. Nihongo wo benkyou shiteimasu. Yoroshiku onegaishimasu.",
      isComplete: true,
    },
    notes: {
      content: `- "こんにちは" (Konnichiwa) = Hello/Good afternoon
- "私の名前は" (Watashi no namae wa) = My name is
- "勉強しています" (Benkyou shiteimasu) = I am studying
- "よろしくお願いします" (Yoroshiku onegaishimasu) = Please treat me well / Nice to meet you

Remember to practice the proper intonation for "よろしくお願いします" - rising on "shi" and falling on "masu".`,
      vocabulary: [
        { word: "こんにちは", meaning: "Hello/Good afternoon" },
        { word: "私", meaning: "I/me" },
        { word: "名前", meaning: "Name" },
        { word: "勉強", meaning: "Study" },
        { word: "よろしくお願いします", meaning: "Nice to meet you" },
      ],
    },
  },
  {
    id: "2",
    title: "Restaurant Phrases",
    language: "French",
    duration: 158, // 2:38
    createdAt: new Date(Date.now() - 86400000), // yesterday
  },
  {
    id: "3",
    title: "Shopping Vocabulary",
    language: "Korean",
    duration: 222, // 3:42
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
  },
];

// API functions
export const fetchRecordings = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching recordings...");
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockRecordings;
  },
);

export const recordingsQueryOptions = () =>
  queryOptions({
    queryKey: ["recordings"],
    queryFn: () => fetchRecordings(),
  });

export const fetchRecording = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    console.info(`Fetching recording with id ${id}...`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const recording = mockRecordings.find((r) => r.id === id);

    if (!recording) {
      throw notFound();
    }

    return recording;
  });

export const recordingQueryOptions = (recordingId: string) =>
  queryOptions({
    queryKey: ["recording", recordingId],
    queryFn: () => fetchRecording({ data: recordingId }),
  });

export const createRecording = createServerFn({ method: "POST" })
  .validator((data: Omit<Recording, "id" | "createdAt">) => data)
  .handler(async ({ data }) => {
    console.info("Creating new recording...");
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const newRecording: Recording = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    // In a real app, we'd save this to a database
    mockRecordings.unshift(newRecording);

    return newRecording;
  });

export const updateRecordingTranscription = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; transcription: Partial<Transcription> }) => data,
  )
  .handler(async ({ data }) => {
    console.info(`Updating transcription for recording ${data.id}...`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    const recording = mockRecordings.find((r) => r.id === data.id);

    if (!recording) {
      throw notFound();
    }

    recording.transcription = {
      ...(recording.transcription || { text: "", isComplete: false }),
      ...data.transcription,
      lastUpdated: new Date(),
    };

    return recording;
  });

export const updateRecordingNotes = createServerFn({ method: "POST" })
  .validator((data: { id: string; notes: Partial<Notes> }) => data)
  .handler(async ({ data }) => {
    console.info(`Updating notes for recording ${data.id}...`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    const recording = mockRecordings.find((r) => r.id === data.id);

    if (!recording) {
      throw notFound();
    }

    recording.notes = {
      ...(recording.notes || { content: "" }),
      ...data.notes,
      lastUpdated: new Date(),
    };

    return recording;
  });

// Utility function to format duration in seconds to MM:SS format
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

// Format a date relative to now (Today, Yesterday, X days ago, or full date)
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};
