
import { genkit } from 'genkit';
import { googleAI as googleAIFactory } from '@genkit-ai/google-genai';

// Le plugin utilise automatiquement la variable d'environnement GOOGLE_GENAI_API_KEY
export const googleAI = googleAIFactory();

export const ai = genkit({
  plugins: [googleAI],
});
