import * as IntentLauncher from 'expo-intent-launcher';

export async function startDictation(language: string): Promise<string | null> {
  const result = await IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
    extra: {
      'android.speech.extra.LANGUAGE_MODEL': 'free_form',
      'android.speech.extra.LANGUAGE': language,
      'android.speech.extra.PROMPT': 'Describe your symptoms',
    },
  });
  const extras = result.extra;
  if (!extras || typeof extras !== 'object' || !('android.speech.extra.RESULTS' in extras)) return null;
  const matches = extras['android.speech.extra.RESULTS'];
  return Array.isArray(matches) && typeof matches[0] === 'string' ? matches[0] : null;
}
