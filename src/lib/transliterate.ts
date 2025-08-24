import { transliterate } from "transliteration";
import {
  isSupportedTranslateLanguage,
  normalizeTranslateLanguage,
} from "~/lib/languages";

export function transliterateText(
  text: string,
  languageCode: string,
  sourceScriptCode: string,
  targetScriptCode: string = "Latn",
): string {
  const lang = normalizeTranslateLanguage(languageCode);

  if (!isSupportedTranslateLanguage(lang)) {
    throw new Error(`Unsupported language code: ${languageCode}`);
  }

  if (sourceScriptCode === targetScriptCode) {
    return text;
  }

  return transliterate(text);
}
