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
    /\b(left|right)?\s*(?:front of (?:my|the)\s+(left|right)?\s*)?(shoulder|knee|neck|chest|hip|elbow|wrist|ankle|back|head|stomach|abdomen|arm|forearm|hand|finger|leg|thigh|calf|foot|toe|jaw|face|eye|ear|throat)\b/i,
    (m) => {
      const side = m[1] || m[2];
      const part = m[3].toLowerCase();
      const anterior = /front of/i.test(m[0]) ? 'anterior ' : '';
      return `${side ? `${side[0].toUpperCase()}${side.slice(1).toLowerCase()} ` : ''}${anterior}${part}`.replace(/^./, (c) => c.toUpperCase());
    },
  ],
  [/\b(pain|painful|hurt|hurts|hurting)\b/i, () => 'Pain'],
  [/\b(dull|ache|aching)\b/i, () => 'Dull aching pain'],
  [/\b(sharp|stabbing)\b/i, () => 'Sharp pain'],
  [/\bburn/i, () => 'Burning sensation'],
  [/\bthrob|puls/i, () => 'Throbbing pain'],
  [/\b(headache|migraine)\b/i, () => 'Headache'],
  [/worse.*(rais|lift)\w*\s+(my\s+)?arm|(rais|lift)\w*\s+(my\s+)?arm.*worse/i, () => 'Worse with arm elevation'],
  [/\bscreen\b/i, () => 'Associated with screen use'],
  [/\b(numbness|numb|tingling|pins and needles)\b/i, () => 'Numbness or tingling'],
  [/\b(swelling|swollen|inflammation)\b/i, () => 'Swelling'],
  [/\b(stiffness|stiff)\b/i, () => 'Stiffness'],
  [/\b(fatigue|fatigued|tired|exhausted|low energy)\b/i, () => 'Fatigue'],
  [/\b(fever|febrile|high temperature)\b/i, () => 'Fever'],
  [/\b(chills|chilly|shivering)\b/i, () => 'Chills'],
  [/\b(nausea|nauseated|queasy|sick to my stomach)\b/i, () => 'Nausea'],
  [/\b(vomiting|vomit|threw up|throwing up)\b/i, () => 'Vomiting'],
  [/\b(diarrhea|loose stools)\b/i, () => 'Diarrhea'],
  [/\b(constipation|constipated)\b/i, () => 'Constipation'],
  [/\b(dizziness|dizzy|lightheaded|vertigo)\b/i, () => 'Dizziness'],
  [/\b(fainting|fainted|passed out|passing out)\b/i, () => 'Fainting'],
  [/\b(shortness of breath|short of breath|breathless|difficulty breathing)\b/i, () => 'Shortness of breath'],
  [/\b(cough|coughing)\b/i, () => 'Cough'],
  [/\b(palpitations|heart racing|racing heart)\b/i, () => 'Palpitations'],
  [/\b(weakness|weak)\b/i, () => 'Weakness'],
  [/\b(rash|hives|skin eruption)\b/i, () => 'Rash'],
  [/\b(itching|itchy)\b/i, () => 'Itching'],
  [/\b(bruising|bruises|bruise)\b/i, () => 'Bruising'],
  [/\b(cramp|cramping|muscle spasm|spasms)\b/i, () => 'Muscle cramps or spasms'],
  [/\b(sore throat|throat pain)\b/i, () => 'Sore throat'],
  [/\b(runny nose|nasal congestion|stuffy nose|congestion)\b/i, () => 'Nasal congestion'],
  [/\b(wheezing|wheeze)\b/i, () => 'Wheezing'],
  [/\b(heartburn|acid reflux)\b/i, () => 'Heartburn'],
  [/\b(painful urination|burning urination|pain when urinating)\b/i, () => 'Painful urination'],
  [/\b(frequent urination|urinating frequently)\b/i, () => 'Frequent urination'],
  [/\b(blurred vision|blurry vision|vision changes)\b/i, () => 'Vision changes'],
  [/\b(loss of appetite|poor appetite|increased appetite)\b/i, () => 'Appetite change'],
  [/\b(insomnia|trouble sleeping|poor sleep)\b/i, () => 'Sleep disturbance'],
];

function hasNonNegatedMatch(text: string, pattern: RegExp) {
  const matcher = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text))) {
    const sentenceStart = Math.max(
      text.lastIndexOf('.', match.index),
      text.lastIndexOf('!', match.index),
      text.lastIndexOf('?', match.index),
    );
    const prefix = text.slice(sentenceStart + 1, match.index).split(/\b(?:but|however|although|yet)\b/i).pop() || '';
    if (!/\b(?:no|not|without|denies|denied|never)\b(?:\s+\w+){0,4}\s*$/i.test(prefix)) return match;
  }
  return null;
}

/** Extract useful English clinical keywords from translated text. */
export function translateSymptom(text: string, from: Language) {
  const trimmed = text.trim();
  if (trimmed === TRANSLATION_EXAMPLE.source) {
    return { english: TRANSLATION_EXAMPLE.english, keywords: TRANSLATION_EXAMPLE.keywords, connected: true };
  }
  const english = trimmed;
  const keywords = [...new Set(KEYWORDS.flatMap(([re, label]) => {
    const m = hasNonNegatedMatch(english, re);
    return m ? [label(m)] : [];
  }))];
  if (/\b(?:no|without|denies|denied)\s+(?:any\s+)?(?:numbness|tingling)\b/i.test(english)) {
    keywords.push('No numbness or tingling reported');
  }
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
