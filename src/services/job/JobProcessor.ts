import { TranscriptionJobManager } from "./TranscriptionJobManager";
import { TranscriptionJobInfo } from "./TranscriptionJobInfo";

/**
 * Configuration options for the JobProcessor
 */
export interface JobProcessorConfig {
  /**
   * Polling interval in milliseconds (how often to check for pending jobs)
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;

  /**
   * Maximum number of concurrent jobs to process
   * @default 3
   */
  concurrency?: number;
}

/**
 * Processor for running transcription jobs in the background
 */
export class JobProcessor {
  private jobManager: TranscriptionJobManager;
  private config: Required<JobProcessorConfig>;
  private isRunning = false;
  private pollingIntervalId: NodeJS.Timeout | null = null;
  private activeJobs = new Set<string>();

  /**
   * Creates a new JobProcessor
   * @param jobManager The TranscriptionJobManager instance
   * @param config Configuration options
   */
  constructor(
    jobManager: TranscriptionJobManager,
    config?: JobProcessorConfig,
  ) {
    this.jobManager = jobManager;
    this.config = {
      pollingInterval: config?.pollingInterval ?? 30000, // 30 seconds
      concurrency: config?.concurrency ?? 3,
    };
  }

  /**
   * Starts the job processor
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Schedule immediate execution
    setTimeout(() => this.processJobs(), 0);

    // Set up polling interval
    this.pollingIntervalId = setInterval(() => {
      this.processJobs();
    }, this.config.pollingInterval);
  }

  /**
   * Stops the job processor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingIntervalId !== null) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  /**
   * Process pending jobs
   * @private
   */
  private async processJobs(): Promise<void> {
    if (this.activeJobs.size >= this.config.concurrency) {
      return; // At maximum concurrency
    }

    try {
      const pendingJobs = await this.jobManager.listPendingJobs();

      // Calculate how many new jobs we can take on
      const availableSlots = this.config.concurrency - this.activeJobs.size;
      const jobsToProcess = pendingJobs.slice(0, availableSlots);

      for (const job of jobsToProcess) {
        this.processJob(job).catch((err) => {
          console.error(`Error processing job ${job.jobId}:`, err);
        });
      }
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
    }
  }

  /**
   * Process a single job
   * @param job The job to process
   * @private
   */
  private async processJob(job: TranscriptionJobInfo): Promise<void> {
    if (!this.isRunning || this.activeJobs.has(job.jobId)) {
      return;
    }

    try {
      this.activeJobs.add(job.jobId);

      // Update job to in progress
      await this.jobManager.updateJobStatus(job.jobId, "IN_PROGRESS");

      // Here you would typically:
      // 1. Retrieve the job details
      // 2. Process the job (e.g., send to transcription service)
      // 3. Update the job status based on results

      // This is a placeholder for the actual job processing logic
      // In a real implementation, you would integrate with transcription services here
      console.log(
        `Processing job ${job.jobId} for recording ${job.recordingId}`,
      );

      // Implementation left intentionally blank as it would depend on
      // specific transcription service integration
    } catch (error) {
      // Handle error and update job status
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.jobManager.updateJobStatus(job.jobId, "FAILED", errorMessage);
      console.error(`Job ${job.jobId} failed:`, errorMessage);
    } finally {
      this.activeJobs.delete(job.jobId);
    }
  }

  /**
   * Gets the number of currently active jobs
   */
  getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Checks if the processor is running
   */
  isProcessorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Updates the processor configuration
   * @param config New configuration options
   */
  updateConfig(config: Partial<JobProcessorConfig>): void {
    const newConfig = {
      ...this.config,
      ...config,
    };

    // If we changed the polling interval and the processor is running,
    // restart the interval with the new timing
    if (
      this.isRunning &&
      this.pollingIntervalId !== null &&
      newConfig.pollingInterval !== this.config.pollingInterval
    ) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = setInterval(() => {
        this.processJobs();
      }, newConfig.pollingInterval);
    }

    this.config = newConfig as Required<JobProcessorConfig>;
  }
}
