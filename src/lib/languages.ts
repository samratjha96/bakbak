export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  transcribeCode: string;
  translateCode: string;
}

export const languages: Language[] = [
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
    code: "zh",
    name: "Mandarin",
    nativeName: "普通话",
    transcribeCode: "zh-CN",
    translateCode: "zh",
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
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    transcribeCode: "it-IT",
    translateCode: "it",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    transcribeCode: "pt-BR",
    translateCode: "pt",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    transcribeCode: "ru-RU",
    translateCode: "ru",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    transcribeCode: "ar-SA",
    translateCode: "ar",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    transcribeCode: "hi-IN",
    translateCode: "hi",
  },
  {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    transcribeCode: "vi-VN",
    translateCode: "vi",
  },
  {
    code: "th",
    name: "Thai",
    nativeName: "ไทย",
    transcribeCode: "th-TH",
    translateCode: "th",
  },
  { code: "en", name: "English", transcribeCode: "en-US", translateCode: "en" },
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

// Additional helpers for script-aware features (transliteration)

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
    it: "Latn",
    pt: "Latn",
    vi: "Latn",
    ja: "Jpan",
    ko: "Kore",
    ru: "Cyrl",
    ar: "Arab",
    hi: "Deva",
    th: "Thai",
    zh: "Hans", // default to Simplified; callers may override to Hant
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
    it: ["Latn"],
    pt: ["Latn"],
    vi: ["Latn"],
    ja: ["Jpan", "Latn"],
    ko: ["Kore", "Latn"],
    ru: ["Cyrl", "Latn"],
    ar: ["Arab", "Latn"],
    hi: ["Deva", "Latn"],
    th: ["Thai", "Latn"],
    zh: ["Hans", "Hant", "Latn"],
  };
  return supported[base] || [];
};
