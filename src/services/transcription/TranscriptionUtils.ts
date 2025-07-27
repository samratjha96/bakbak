import { TranscriptionItem, TranscriptionResult } from "./TranscriptionService";

/**
 * Utility functions for working with transcriptions
 */
export class TranscriptionUtils {
  /**
   * Formats seconds into a human-readable timestamp (MM:SS.MS or HH:MM:SS.MS)
   * @param timeInSeconds Time in seconds
   * @returns Formatted timestamp string
   */
  public static formatTimestamp(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
    } else {
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
    }
  }

  /**
   * Converts a TranscriptionResult to SRT subtitle format
   * @param result The transcription result
   * @returns SRT formatted string
   */
  public static toSRT(result: TranscriptionResult): string {
    let srt = "";
    let index = 1;
    let currentText = "";
    let currentStart = 0;
    let currentEnd = 0;
    let currentSpeaker = "";

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i];

      // Group by speaker and create reasonable chunks
      if (
        i > 0 &&
        (item.speaker !== currentSpeaker ||
          item.startTime - currentEnd > 2 ||
          currentText.length > 80)
      ) {
        // Output the current chunk
        srt += `${index}\n`;
        srt += `${this.formatSRTTimestamp(currentStart)} --> ${this.formatSRTTimestamp(currentEnd)}\n`;
        if (currentSpeaker) {
          srt += `${currentSpeaker}: ${currentText}\n\n`;
        } else {
          srt += `${currentText}\n\n`;
        }

        // Reset for next chunk
        index++;
        currentText = item.content;
        currentStart = item.startTime;
        currentEnd = item.endTime;
        currentSpeaker = item.speaker || "";
      } else {
        // Add to current chunk
        if (i === 0) {
          currentText = item.content;
          currentStart = item.startTime;
          currentEnd = item.endTime;
          currentSpeaker = item.speaker || "";
        } else {
          currentText += " " + item.content;
          currentEnd = item.endTime;
        }
      }
    }

    // Add the last chunk if there is one
    if (currentText) {
      srt += `${index}\n`;
      srt += `${this.formatSRTTimestamp(currentStart)} --> ${this.formatSRTTimestamp(currentEnd)}\n`;
      if (currentSpeaker) {
        srt += `${currentSpeaker}: ${currentText}\n\n`;
      } else {
        srt += `${currentText}\n\n`;
      }
    }

    return srt;
  }

  /**
   * Formats a timestamp for SRT format (00:00:00,000)
   * @param timeInSeconds Time in seconds
   * @returns SRT formatted timestamp
   */
  private static formatSRTTimestamp(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
  }

  /**
   * Converts a TranscriptionResult to a simplified JSON format
   * @param result The transcription result
   * @returns Simplified JSON object
   */
  public static toSimplifiedJSON(result: TranscriptionResult): any {
    // Group by speakers
    const speakerSegments: {
      speaker: string;
      segments: {
        text: string;
        startTime: number;
        endTime: number;
      }[];
    }[] = [];

    let currentSpeaker = "";
    let currentSegment: any = null;

    for (const item of result.items) {
      if (item.type === "punctuation") continue;

      const speaker = item.speaker || "Unknown";

      if (speaker !== currentSpeaker) {
        currentSpeaker = speaker;
        currentSegment = {
          speaker,
          segments: [
            {
              text: item.content,
              startTime: item.startTime,
              endTime: item.endTime,
            },
          ],
        };
        speakerSegments.push(currentSegment);
      } else {
        currentSegment.segments.push({
          text: item.content,
          startTime: item.startTime,
          endTime: item.endTime,
        });
      }
    }

    return {
      transcript: result.transcript,
      languageCode: result.languageCode,
      speakers: speakerSegments,
    };
  }

  /**
   * Finds segments containing the search text
   * @param result The transcription result
   * @param searchText Text to search for
   * @returns Array of matching segments with timing information
   */
  public static findInTranscript(
    result: TranscriptionResult,
    searchText: string,
  ): { text: string; startTime: number; endTime: number }[] {
    if (!result.transcript || !searchText || !result.items.length) {
      return [];
    }

    // Preprocess search text
    const lowerSearchText = searchText.toLowerCase().trim();
    if (lowerSearchText.length === 0) {
      return [];
    }

    // Build an index mapping text positions to items for more accurate search results
    const textPositionToItemIndex = new Map<number, number>();

    // Pre-compute item positions in transcript
    let currentPosition = 0;
    const itemPositions: { start: number; end: number; index: number }[] = [];

    // Create a more accurate position index for each word in the transcript
    result.items.forEach((item, index) => {
      if (item.type !== "punctuation" && item.content) {
        const itemStart = result.transcript
          .toLowerCase()
          .indexOf(item.content.toLowerCase(), currentPosition);
        if (itemStart !== -1) {
          const itemEnd = itemStart + item.content.length;
          itemPositions.push({ start: itemStart, end: itemEnd, index });
          currentPosition = itemEnd;
        }
      }
    });

    // Search for matches using the position index
    const matches: { text: string; startTime: number; endTime: number }[] = [];
    const lowerTranscript = result.transcript.toLowerCase();

    let startIdx = 0;
    while (startIdx < lowerTranscript.length) {
      const foundIdx = lowerTranscript.indexOf(lowerSearchText, startIdx);
      if (foundIdx === -1) break;

      // Find the nearest item indexes using our position mapping
      let startItemIndex = -1;
      let endItemIndex = -1;

      // Find the closest item containing or before the match start
      for (let i = 0; i < itemPositions.length; i++) {
        const pos = itemPositions[i];
        if (pos.start <= foundIdx && pos.end > foundIdx) {
          startItemIndex = pos.index;
          break;
        } else if (
          pos.end <= foundIdx &&
          (i === itemPositions.length - 1 ||
            itemPositions[i + 1].start > foundIdx)
        ) {
          startItemIndex = pos.index;
          break;
        }
      }

      // Find the closest item containing or after the match end
      const matchEnd = foundIdx + lowerSearchText.length;
      for (let i = 0; i < itemPositions.length; i++) {
        const pos = itemPositions[i];
        if (pos.start <= matchEnd && pos.end >= matchEnd) {
          endItemIndex = pos.index;
          break;
        } else if (
          pos.start >= matchEnd &&
          (i === 0 || itemPositions[i - 1].end < matchEnd)
        ) {
          endItemIndex = pos.index;
          break;
        }
      }

      if (startItemIndex === -1) startItemIndex = 0;
      if (endItemIndex === -1) endItemIndex = result.items.length - 1;

      // Extend context for better user experience
      const contextStartIndex = Math.max(0, startItemIndex - 3);
      const contextEndIndex = Math.min(
        result.items.length - 1,
        endItemIndex + 3,
      );

      const matchStartTime = result.items[contextStartIndex].startTime;
      const matchEndTime = result.items[contextEndIndex].endTime;

      // Extract the matching text with some context
      const segmentTexts = result.items
        .slice(contextStartIndex, contextEndIndex + 1)
        .filter((item) => item.content)
        .map((item) => item.content);

      const matchText = segmentTexts.join(" ");

      matches.push({
        text: matchText,
        startTime: matchStartTime,
        endTime: matchEndTime,
      });

      startIdx = foundIdx + lowerSearchText.length;
    }

    return matches;
  }
}
