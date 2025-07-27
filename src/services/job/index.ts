export type { TranscriptionJobInfo } from "./TranscriptionJobInfo";
export { JobStatus } from "./TranscriptionJobInfo";
export type { TranscriptionJobManager } from "./TranscriptionJobManager";
export { JobProcessor } from "./JobProcessor";
export type { JobProcessorConfig } from "./JobProcessor";
export { JobManagerFactory } from "./JobManagerFactory";
export type { JobManagerFactoryConfig } from "./JobManagerFactory";

// Export a default singleton instance for easy access
import { JobManagerFactory } from "./JobManagerFactory";
export const jobManager = JobManagerFactory.getInstance().getJobManager();

/**
 * Helper function to get the job processor and ensure it exists
 */
export function getJobProcessor() {
  const factory = JobManagerFactory.getInstance();
  let processor = factory.getJobProcessor();

  if (!processor) {
    processor = factory.createJobProcessor();
  }

  return processor;
}

/**
 * Start the job processor with default configuration
 */
export function startJobProcessing() {
  JobManagerFactory.getInstance().startProcessing();
}

/**
 * Stop the job processor
 */
export function stopJobProcessing() {
  JobManagerFactory.getInstance().stopProcessing();
}
