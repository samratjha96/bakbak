import { TranscriptionJobManager } from "./TranscriptionJobManager";
import { JobProcessor, JobProcessorConfig } from "./JobProcessor";

/**
 * Configuration for the JobManagerFactory
 */
export interface JobManagerFactoryConfig {
  /**
   * Configuration for the JobProcessor
   */
  processor?: JobProcessorConfig;

  /**
   * Whether to automatically start the job processor
   * @default false
   */
  autoStartProcessor?: boolean;
}

/**
 * Factory for creating and managing TranscriptionJobManager and JobProcessor instances
 */
export class JobManagerFactory {
  private static instance: JobManagerFactory;
  private jobManager: TranscriptionJobManager;
  private jobProcessor: JobProcessor | null = null;
  private config: JobManagerFactoryConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: JobManagerFactoryConfig = {}) {
    this.config = config;
    this.jobManager = new TranscriptionJobManager();

    // Create job processor if configured
    if (config.processor) {
      this.jobProcessor = new JobProcessor(this.jobManager, config.processor);

      // Auto-start processor if configured
      if (config.autoStartProcessor) {
        this.jobProcessor.start();
      }
    }
  }

  /**
   * Gets the singleton instance
   */
  public static getInstance(
    config?: JobManagerFactoryConfig,
  ): JobManagerFactory {
    if (!JobManagerFactory.instance) {
      JobManagerFactory.instance = new JobManagerFactory(config);
    } else if (config) {
      // Update config if provided
      JobManagerFactory.instance.updateConfig(config);
    }

    return JobManagerFactory.instance;
  }

  /**
   * Updates the configuration
   */
  private updateConfig(config: JobManagerFactoryConfig): void {
    this.config = {
      ...this.config,
      ...config,
    };

    // Update or create job processor if needed
    if (config.processor) {
      if (this.jobProcessor) {
        this.jobProcessor.updateConfig(config.processor);
      } else {
        this.jobProcessor = new JobProcessor(this.jobManager, config.processor);
      }

      // Handle auto-start
      if (config.autoStartProcessor !== undefined) {
        if (
          config.autoStartProcessor &&
          !this.jobProcessor.isProcessorRunning()
        ) {
          this.jobProcessor.start();
        } else if (
          !config.autoStartProcessor &&
          this.jobProcessor.isProcessorRunning()
        ) {
          this.jobProcessor.stop();
        }
      }
    }
  }

  /**
   * Gets the TranscriptionJobManager instance
   */
  public getJobManager(): TranscriptionJobManager {
    return this.jobManager;
  }

  /**
   * Gets the JobProcessor instance
   */
  public getJobProcessor(): JobProcessor | null {
    return this.jobProcessor;
  }

  /**
   * Creates and configures a JobProcessor if one doesn't exist
   */
  public createJobProcessor(config?: JobProcessorConfig): JobProcessor {
    if (!this.jobProcessor) {
      this.jobProcessor = new JobProcessor(this.jobManager, config);
    } else if (config) {
      this.jobProcessor.updateConfig(config);
    }

    return this.jobProcessor;
  }

  /**
   * Starts the job processor
   */
  public startProcessing(): void {
    if (!this.jobProcessor) {
      this.jobProcessor = new JobProcessor(this.jobManager);
    }

    this.jobProcessor.start();
  }

  /**
   * Stops the job processor
   */
  public stopProcessing(): void {
    if (this.jobProcessor) {
      this.jobProcessor.stop();
    }
  }
}
