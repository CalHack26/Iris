/**
 * Rule-based stand-in for the "Feedback & suggestions" card. It reads the typed symptom and quick tags and returns
 * gentle, non-diagnostic guidance; swap for a real service when one exists.
 */
export function symptomFeedback(text: string, tags: string[]) {
  const t = `${text} ${tags.join(' ')}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (has('headache', 'head ache') && has('screen', 'computer', 'monitor', 'phone')) {
    return {
      message: 'You might be sitting in front of the screen for too long',
      suggestion: 'Suggestion: massaging your head',
    };
  }
  if (has('headache', 'migraine')) {
    return {
      message: 'Headaches often follow dehydration, short sleep or long screen time.',
      suggestion: 'Suggestion: drink some water and rest your eyes',
    };
  }
  if (has('period', 'cramp')) {
    return {
      message: 'Cramping is common around your period.',
      suggestion: 'Suggestion: gentle heat on your lower abdomen',
    };
  }
  if (has('cold', 'cough', 'sore throat', 'runny')) {
    return { message: 'Cold symptoms usually ease within a week.', suggestion: 'Suggestion: rest and keep warm' };
  }
  if (has('shoulder', 'desk', 'neck', 'back')) {
    return {
      message: 'Long desk sessions can strain your neck and shoulders.',
      suggestion: 'Suggestion: stand up and stretch every hour',
    };
  }
  if (t.trim()) {
    return {
      message: 'Thanks — saving this helps you spot patterns over time.',
      suggestion: 'If symptoms are severe or sudden, contact a clinician.',
    };
  }
  return { message: 'Describe how you feel or pick a tag to see feedback here.', suggestion: '' };
}
