export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  transcribeCode: string;
  translateCode: string;
}

export const languages: Language[] = [
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    transcribeCode: "hi-IN",
    translateCode: "hi",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    transcribeCode: "ja-JP",
    translateCode: "ja",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    transcribeCode: "ko-KR",
    translateCode: "ko",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    transcribeCode: "fr-FR",
    translateCode: "fr",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    transcribeCode: "es-ES",
    translateCode: "es",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    transcribeCode: "de-DE",
    translateCode: "de",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    transcribeCode: "en-US",
    translateCode: "en",
  },
];

export const getLanguageByCode = (code: string) =>
  languages.find((lang) => lang.code === code);

export const getAWSLanguageCode = (
  code: string,
  service: "transcribe" | "translate",
) => languages.find((lang) => lang.code === code)?.[`${service}Code`];

export const normalizeTranslateLanguage = (code: string) => {
  const base = code.split("-")[0].toLowerCase();
  return (
    languages.find((lang) => lang.translateCode === base)?.translateCode || "en"
  );
};

// Additional helpers for script-aware features (romanization)

/**
 * Check if a language code is supported by our Translate/Transliterate flows
 */
export const isSupportedTranslateLanguage = (code: string): boolean => {
  const base = code.split("-")[0].toLowerCase();
  return languages.some((lang) => lang.translateCode === base);
};

/**
 * Return a reasonable default script for a given ISO language code
 * Script codes follow ISO 15924 (e.g., Latn, Jpan, Cyrl, Arab, Hans/Hant)
 */
export const getDefaultScriptForLanguage = (
  languageCode: string,
): string | undefined => {
  const base = normalizeTranslateLanguage(languageCode);
  const defaults: Record<string, string> = {
    en: "Latn",
    fr: "Latn",
    es: "Latn",
    de: "Latn",
    ja: "Jpan",
    ko: "Kore",
    hi: "Deva",
  };
  return defaults[base];
};

/**
 * Return a list of supported scripts for a language (best-effort static mapping)
 */
export const getSupportedScriptsForLanguage = (
  languageCode: string,
): string[] => {
  const base = normalizeTranslateLanguage(languageCode);
  const supported: Record<string, string[]> = {
    en: ["Latn"],
    fr: ["Latn"],
    es: ["Latn"],
    de: ["Latn"],
    ja: ["Jpan", "Latn"],
    ko: ["Kore", "Latn"],
    hi: ["Deva", "Latn"],
  };
  return supported[base] || [];
};
