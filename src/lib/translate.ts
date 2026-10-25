import { TRANSLATION_EXAMPLE } from '@/data/seed';

export const LANGUAGES = ['French', 'Spanish', 'Vietnamese', 'Mandarin', 'English'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Speech codes for expo-speech. */
export const SPEECH_CODE: Record<Language, string> = {
  French: 'fr-FR',
  Spanish: 'es-ES',
  Vietnamese: 'vi-VN',
  Mandarin: 'zh-CN',
  English: 'en-US',
};

const KEYWORDS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [
    /\b(left|right)?\s*(?:front of (?:my|the)\s+(left|right)?\s*)?(shoulder|knee|neck|chest|hip|elbow|wrist|ankle|back|head|stomach|abdomen)\b/i,
    (m) => {
      const side = m[1] || m[2];
      const part = m[3].toLowerCase();
      const anterior = /front of/i.test(m[0]) ? 'anterior ' : '';
      return `${side ? `${side[0].toUpperCase()}${side.slice(1).toLowerCase()} ` : ''}${anterior}${part}`.replace(/^./, (c) => c.toUpperCase());
    },
  ],
  [/\b(dull|ache|aching)\b/i, () => 'Dull aching pain'],
  [/\bsharp|stabbing\b/i, () => 'Sharp pain'],
  [/\bburn/i, () => 'Burning sensation'],
  [/\bthrob|puls/i, () => 'Throbbing pain'],
  [/\bheadache\b/i, () => 'Headache'],
  [/worse.*(rais|lift)\w*\s+(my\s+)?arm|(rais|lift)\w*\s+(my\s+)?arm.*worse/i, () => 'Worse with arm elevation'],
  [/\bscreen\b/i, () => 'Associated with screen use'],
  [/\bno numbness|no tingling|numbness or tingling/i, () => 'No numbness or tingling reported'],
];

/** Extract useful English clinical keywords from translated text. */
export function translateSymptom(text: string, from: Language) {
  const trimmed = text.trim();
  if (trimmed === TRANSLATION_EXAMPLE.source) {
    return { english: TRANSLATION_EXAMPLE.english, keywords: TRANSLATION_EXAMPLE.keywords, connected: true };
  }
  const english = trimmed;
  const keywords = KEYWORDS.flatMap(([re, label]) => {
    const m = english.match(re);
    return m ? [label(m)] : [];
  });
  return { english, keywords, connected: from === 'English' };
}

const SOURCE_CODE: Record<Language, string> = {
  French: 'fr',
  Spanish: 'es',
  Vietnamese: 'vi',
  Mandarin: 'zh-CN',
  English: 'en',
};

type TranslationResponse = {
  responseStatus?: number;
  responseDetails?: string;
  quotaFinished?: boolean;
  responseData?: { translatedText?: string };
};

/** Translate text to English with MyMemory's free, anonymous translation endpoint. */
export async function translateToEnglish(text: string, from: Language): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter or dictate a symptom before translating.');
  if (from === 'English') return trimmed;
  const encodedLength = encodeURIComponent(trimmed).replace(/%[0-9A-F]{2}/gi, 'U').length;
  if (encodedLength > 500) throw new Error('Please keep each translation under 500 bytes.');

  const query = new URLSearchParams({ q: trimmed, langpair: `${SOURCE_CODE[from]}|en` });
  const response = await fetch(`https://api.mymemory.translated.net/get?${query.toString()}`);
  if (!response.ok) throw new Error(`Translation service returned ${response.status}.`);

  const result = (await response.json()) as TranslationResponse;
  if (result.quotaFinished) throw new Error('The free translation service has reached its daily limit.');
  const english = result.responseData?.translatedText?.trim();
  if (result.responseStatus !== 200 || !english) {
    throw new Error(result.responseDetails || 'The translation service returned no translation.');
  }
  return english;
}
