/**
 * This file is maintained for backward compatibility.
 *
 * @deprecated Import from '~/lib/languages' instead.
 */

// Re-export from the centralized language module
import { Language, languages, getLanguageByCode } from "~/lib/languages";

export { Language, languages, getLanguageByCode };
