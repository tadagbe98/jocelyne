
'use server';

/**
 * @fileOverview Generates socio-economic impact indicators for a project.
 *
 * - generateImpactIndicators - A function that generates impact indicators for a given project description.
 * - GenerateImpactIndicatorsInput - The input type for the generateImpactIndicators function.
 * - GenerateImpactIndicatorsOutput - The return type for the generateImpactIndicators function.
 */

import {ai, googleAI} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImpactIndicatorsInputSchema = z.object({
  projectDescription: z
    .string()
    .describe('A detailed description of the project for which to generate impact indicators.'),
});
export type GenerateImpactIndicatorsInput = z.infer<typeof GenerateImpactIndicatorsInputSchema>;

const GenerateImpactIndicatorsOutputSchema = z.object({
  indicators: z
    .string()
    .describe('A list of key socio-economic impact indicators relevant to the project.'),
});
export type GenerateImpactIndicatorsOutput = z.infer<typeof GenerateImpactIndicatorsOutputSchema>;

/**
 * Server action wrapper for the impact indicators generation flow.
 */
export async function generateImpactIndicators(
  input: GenerateImpactIndicatorsInput
): Promise<GenerateImpactIndicatorsOutput> {
  return generateImpactIndicatorsFlow(input);
}

/**
 * Prompt definition for generating impact indicators.
 */
const impactPrompt = ai.definePrompt({
  name: 'generateImpactIndicatorsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: GenerateImpactIndicatorsInputSchema},
  output: {schema: GenerateImpactIndicatorsOutputSchema},
  prompt: `You are an expert in socio-economic impact assessment.

Based on the following project description, identify key socio-economic impact indicators that can be used to measure and track the project's success.

Project Description: {{{projectDescription}}}

List the indicators in a clear, concise, and measurable format.
Consider both quantitative and qualitative indicators.
Also consider both leading and lagging indicators.

Provide the response as a well-structured text list.`,
});

/**
 * Flow definition that executes the prompt.
 */
const generateImpactIndicatorsFlow = ai.defineFlow(
  {
    name: 'generateImpactIndicatorsFlow',
    inputSchema: GenerateImpactIndicatorsInputSchema,
    outputSchema: GenerateImpactIndicatorsOutputSchema,
  },
  async (input) => {
    try {
      const response = await impactPrompt(input);
      
      if (!response || !response.output) {
        throw new Error("Le modèle n'a pas renvoyé de résultat valide. Veuillez réessayer.");
      }
      
      return response.output;
    } catch (error: any) {
      console.error("Genkit Flow Error:", error);
      throw new Error(error.message || "Une erreur technique est survenue lors de l'appel à l'IA.");
    }
  }
);
