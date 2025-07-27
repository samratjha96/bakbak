// Export interfaces and types
export type {
  TranslationService,
  TranslationSegment,
  TranscriptionData,
  TranslationResult,
} from "./TranslationService";

// Export service implementations
export { AWSTranslateService } from "./AWSTranslateService";
export { MockTranslateService } from "./MockTranslateService";

// Export factory
export { TranslationServiceFactory } from "./TranslationServiceFactory";

// Default export is the factory
import { TranslationServiceFactory } from "./TranslationServiceFactory";
export default TranslationServiceFactory;
