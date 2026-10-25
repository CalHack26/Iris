interface RecognitionResult {
  transcript: string;
}

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionResult>>;
}

interface RecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
}

interface RecognitionConstructor {
  new (): RecognitionInstance;
}

export async function startDictation(language: string): Promise<string | null> {
  const speechWindow = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
  if (!Recognition) return null;

  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    let transcript = '';
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      transcript = event.results[0]?.[0]?.transcript || '';
    };
    recognition.onerror = (event) => {
      finish(() => reject(new Error(`Speech recognition failed${event.error ? `: ${event.error}` : '.'}`)));
    };
    recognition.onend = () => {
      finish(() => (transcript ? resolve(transcript) : resolve(null)));
    };
    recognition.start();
  });
}
