import {genkit} from 'genkit';
import {googleAI as googleAIFactory} from '@genkit-ai/google-genai';

export const googleAI = googleAIFactory();

export const ai = genkit({
  plugins: [googleAI],
});
