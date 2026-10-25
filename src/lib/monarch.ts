import type { SymptomRecord } from './types';

const API = 'https://api.monarchinitiative.org/v3/api';
const MAX_PHENOTYPES = 3;

const LOCATION_TERMS: [RegExp, string][] = [
  [/\bshoulder\b/i, 'shoulder pain'],
  [/\bneck\b/i, 'neck pain'],
  [/\bknee\b/i, 'knee pain'],
  [/\bhip\b/i, 'hip pain'],
  [/\belbow\b/i, 'elbow pain'],
  [/\bwrist\b/i, 'wrist pain'],
  [/\bankle\b/i, 'ankle pain'],
  [/\bchest\b/i, 'chest pain'],
  [/\b(abdomen|stomach)\b/i, 'abdominal pain'],
  [/\bback\b/i, 'back pain'],
  [/\b(head|temple)\b/i, 'headache'],
  [/\barm\b/i, 'arm pain'],
  [/\b(calf|leg)\b/i, 'leg pain'],
];

type SearchItem = { id?: string; category?: string; name?: string };
type AssociationItem = { subject?: string; subject_label?: string };

async function getItems<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Monarch API returned ${response.status}.`);
  const data: { items?: T[] } = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Monarch API returned an unexpected response.');
  return data.items;
}

function searchTerm(location: string) {
  return LOCATION_TERMS.find(([pattern]) => pattern.test(location))?.[1];
}

export type PotentialCondition = { id: string; name: string; matchedSymptoms: number };

/** Match generalized body locations to Monarch phenotypes, then retrieve linked diseases. */
export async function findPotentialConditions(records: SymptomRecord[]): Promise<PotentialCondition[]> {
  const terms = [...new Set(records.map((record) => searchTerm(record.location)).filter((term): term is string => !!term))].slice(
    0,
    MAX_PHENOTYPES,
  );
  const matches = new Map<string, PotentialCondition>();

  await Promise.all(
    terms.map(async (term) => {
      const searchParams = new URLSearchParams({ q: term, category: 'biolink:PhenotypicFeature', limit: '5' });
      const phenotypes = await getItems<SearchItem>(`${API}/search?${searchParams.toString()}`);
      const phenotype = phenotypes.find((item) => item.id?.startsWith('HP:') && item.category === 'biolink:PhenotypicFeature');
      if (!phenotype?.id) return;

      const associationParams = new URLSearchParams({
        object: phenotype.id,
        subject_category: 'biolink:Disease',
        limit: '100',
      });
      const associations = await getItems<AssociationItem>(`${API}/association?${associationParams.toString()}`);
      for (const association of associations) {
        if (!association.subject || !association.subject_label) continue;
        const match = matches.get(association.subject);
        if (match) {
          match.matchedSymptoms += 1;
        } else {
          matches.set(association.subject, {
            id: association.subject,
            name: association.subject_label,
            matchedSymptoms: 1,
          });
        }
      }
    }),
  );

  return [...matches.values()]
    .sort((a, b) => b.matchedSymptoms - a.matchedSymptoms || a.name.localeCompare(b.name))
    .slice(0, 5);
}
