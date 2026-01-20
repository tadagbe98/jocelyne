'use server';

/**
 * @fileOverview Generates socio-economic impact indicators for a project.
 *
 * - generateImpactIndicators - A function that generates impact indicators for a given project description.
 * - GenerateImpactIndicatorsInput - The input type for the generateImpactIndicators function.
 * - GenerateImpactIndicatorsOutput - The return type for the generateImpactIndicators function.
 */

import {ai} from '@/ai/genkit';
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

export async function generateImpactIndicators(
  input: GenerateImpactIndicatorsInput
): Promise<GenerateImpactIndicatorsOutput> {
  return generateImpactIndicatorsFlow(input);
}

const prompt = ai.definePrompt({
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
`,
});

const generateImpactIndicatorsFlow = ai.defineFlow(
  {
    name: 'generateImpactIndicatorsFlow',
    inputSchema: GenerateImpactIndicatorsInputSchema,
    outputSchema: GenerateImpactIndicatorsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
