import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  fetchRecording,
  updateRecordingTranscription,
} from "~/data/recordings";
import { z } from "zod";
import { transcribe } from "~/lib/transcribe";

// Create a server function to handle GET request for transcription
const getTranscription = createServerFn({ method: "GET" })
  .validator((params: { recordingId: string }) => params)
  .handler(async ({ data: { recordingId } }) => {
    // Fetch the recording
    let recording;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw notFound();
    }

    // Check if the recording has a transcription
    if (
      !recording.isTranscribed ||
      recording.transcriptionStatus !== "COMPLETED"
    ) {
      return {
        status: 404,
        message: "No completed transcription found for this recording",
      };
    }

    // If we have a job ID, fetch the detailed transcription result
    let transcriptionResult: { text: string; items?: any[] } | null = null;
    if (recording.transcriptionUrl) {
      try {
        const jobId = recording.transcriptionUrl.split("/").pop() || "";
        transcriptionResult = await transcribe.getTranscriptionResult(jobId);
      } catch (error) {
        console.error("Error fetching detailed transcription result:", error);
        // We'll continue with the basic transcription stored in the recording
      }
    }

    return {
      status: 200,
      transcription: recording.transcription,
      transcriptionText: recording.transcriptionText,
      transcriptionLastUpdated: recording.transcriptionLastUpdated,
      detailedResult: transcriptionResult,
      recordingId,
    };
  });

// Create a server function to handle PUT request for updating transcription
const updateTranscription = createServerFn({ method: "PUT" })
  .validator(
    (params: {
      recordingId: string;
      text?: string;
      isComplete?: boolean;
      romanization?: string;
    }) => params,
  )
  .handler(async ({ data }) => {
    const { recordingId, text, isComplete, romanization } = data;

    // Fetch the recording
    let recording;
    try {
      recording = await fetchRecording({ data: recordingId });
    } catch (error) {
      throw notFound();
    }

    // Update the transcription
    const updatedRecording = await updateRecordingTranscription({
      data: {
        id: recordingId,
        transcription: {
          text: text || recording.transcriptionText || "",
          romanization:
            romanization || recording.transcription?.romanization || "",
          isComplete:
            isComplete !== undefined ? isComplete : recording.isTranscribed,
        },
      },
    });

    return {
      status: 200,
      message: "Transcription updated successfully",
      transcription: updatedRecording.transcription,
      recordingId,
    };
  });

export const Route = createFileRoute(
  "/api/recordings/$recordingId/transcription/",
)({
  validateParams: z.object({
    recordingId: z.string(),
  }),
  loaderDeps: ({ params: { recordingId } }) => ({
    recordingId,
  }),
  serverComponent: async ({ params, deps, request }) => {
    console.log(
      `[API] /transcription - Request received: ${request.method} ${request.url}`,
    );

    // Set proper JSON content type header
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (params.recordingId !== deps.recordingId) {
      console.error(
        `[API] /transcription - recordingId mismatch: params=${params.recordingId}, deps=${deps.recordingId}`,
      );
      return Response.json(
        { error: "recordingId mismatch" },
        { status: 400, headers },
      );
    }

    try {
      // Handle different HTTP methods
      if (request.method === "GET") {
        console.log(
          `[API] /transcription - Processing GET request for recording ${params.recordingId}`,
        );
        const result = await getTranscription({
          data: {
            recordingId: params.recordingId,
          },
        });
        return Response.json(result, { headers });
      } else if (request.method === "PUT") {
        console.log(
          `[API] /transcription - Processing PUT request for recording ${params.recordingId}`,
        );
        // Parse the request body for PUT
        let body;
        try {
          body = await request.json();
          console.log(
            `[API] /transcription - Request body:`,
            JSON.stringify(body),
          );
        } catch (parseError) {
          console.error(
            `[API] /transcription - Error parsing request body:`,
            parseError,
          );
          return Response.json(
            { error: "Invalid JSON in request body" },
            { status: 400, headers },
          );
        }

        const result = await updateTranscription({
          data: {
            recordingId: params.recordingId,
            ...body,
          },
        });
        return Response.json(result, { headers });
      } else {
        console.log(
          `[API] /transcription - Method not allowed: ${request.method}`,
        );
        return Response.json(
          { error: "Method not allowed" },
          { status: 405, headers },
        );
      }
    } catch (error) {
      console.error(`[API] /transcription - Error processing request:`, error);
      if (error === notFound()) {
        console.log(
          `[API] /transcription - Recording not found: ${params.recordingId}`,
        );
        return Response.json(
          { error: "Recording not found" },
          { status: 404, headers },
        );
      }
      return Response.json(
        { error: error.message || "Internal server error" },
        { status: 500, headers },
      );
    }
  },
});
