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

/**
 * Stand-in for an AI translation service. It returns the design's worked example verbatim and otherwise passes the
 * text through, extracting clinical keywords with simple rules. `connected: false` lets the UI say so.
 */
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
