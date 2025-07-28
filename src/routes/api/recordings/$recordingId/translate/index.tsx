import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { fetchRecording, updateRecordingTranslation } from "~/data/recordings";
import { z } from "zod";

// Create a server function to handle POST request for initiating translation
const initiateTranslation = createServerFn({ method: "POST" })
  .validator(
    (params: { recordingId: string; targetLanguage?: string }) => params,
  )
  .handler(async ({ data }) => {
    const { recordingId, targetLanguage = "en" } = data;

    console.log(
      `[API] /translate POST - Processing translation request for recording ${recordingId} to language ${targetLanguage}`,
    );

    // Fetch the recording
    let recording;
    try {
      console.log(
        `[API] /translate POST - Fetching recording with ID ${recordingId}`,
      );
      recording = await fetchRecording({ data: recordingId });
      console.log(
        `[API] /translate POST - Successfully fetched recording: ${recording.id}, title: ${recording.title}`,
      );
    } catch (error) {
      console.error(
        `[API] /translate POST - Error fetching recording ${recordingId}:`,
        error,
      );
      throw notFound();
    }

    // Check if there's a transcription to translate
    if (!recording.isTranscribed || !recording.transcriptionText) {
      console.log(
        `[API] /translate POST - No transcription available for recording ${recordingId}`,
      );
      return {
        status: 400,
        message: "No transcription available to translate",
      };
    }

    console.log(
      `[API] /translate POST - Transcription found, proceeding with translation`,
    );

    // In a real application, you would initiate an async translation process here
    // For this demo, we'll simulate a translation by appending "[Translated to {targetLanguage}]"
    const translatedText = `${recording.transcriptionText}\n\n[Translated to ${targetLanguage}]`;

    // Update the recording with the translation
    console.log(`[API] /translate POST - Updating recording with translation`);
    let updatedRecording;
    try {
      updatedRecording = await updateRecordingTranslation({
        data: {
          id: recordingId,
          translationText: translatedText,
          translationLanguage: targetLanguage,
        },
      });
      console.log(
        `[API] /translate POST - Successfully updated recording with translation`,
      );
    } catch (error) {
      console.error(
        `[API] /translate POST - Error updating translation:`,
        error,
      );
      throw new Error(
        `Failed to update recording with translation: ${error.message}`,
      );
    }

    console.log(`[API] /translate POST - Returning successful response`);
    const response = {
      status: 200,
      message: "Translation initiated successfully",
      translationText: updatedRecording.translationText,
      translationLanguage: updatedRecording.translationLanguage,
      recordingId,
    };
    console.log(
      `[API] /translate POST - Response payload:`,
      JSON.stringify(response),
    );
    return response;
  });

export const Route = createFileRoute("/api/recordings/$recordingId/translate/")(
  {
    validateParams: z.object({
      recordingId: z.string(),
    }),
    loaderDeps: ({ params: { recordingId } }) => ({
      recordingId,
    }),
    serverComponent: async ({ params, deps, request }) => {
      console.log(
        `[API] /translate - Request received: ${request.method} ${request.url}`,
      );

      // Set proper JSON content type header
      const headers = new Headers({
        "Content-Type": "application/json",
      });

      if (params.recordingId !== deps.recordingId) {
        console.error(
          `[API] /translate - recordingId mismatch: params=${params.recordingId}, deps=${deps.recordingId}`,
        );
        return Response.json(
          { error: "recordingId mismatch" },
          { status: 400, headers },
        );
      }

      try {
        if (request.method === "POST") {
          console.log(
            `[API] /translate - Processing POST request for recording ${params.recordingId}`,
          );
          // Parse the request body for POST
          let body;
          try {
            body = await request.json();
            console.log(
              `[API] /translate - Request body:`,
              JSON.stringify(body),
            );
          } catch (parseError) {
            console.error(
              `[API] /translate - Error parsing request body:`,
              parseError,
            );
            return Response.json(
              { error: "Invalid JSON in request body" },
              { status: 400, headers },
            );
          }

          console.log(
            `[API] /translate - Calling initiateTranslation for recording ${params.recordingId}`,
          );
          const result = await initiateTranslation({
            data: {
              recordingId: params.recordingId,
              ...body,
            },
          });

          return Response.json(result, { headers });
        } else {
          console.log(
            `[API] /translate - Method not allowed: ${request.method}`,
          );
          return Response.json(
            { error: "Method not allowed" },
            { status: 405, headers },
          );
        }
      } catch (error) {
        console.error(`[API] /translate - Error processing request:`, error);
        if (error === notFound()) {
          console.log(
            `[API] /translate - Recording not found: ${params.recordingId}`,
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
  },
);
