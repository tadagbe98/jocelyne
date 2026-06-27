'use server';

/**
 * @fileOverview Génère des indicateurs d'impact socio-économique pour un projet.
 *
 * - generateImpactIndicators - Une fonction qui génère des indicateurs d'impact pour une description de projet donnée.
 * - GenerateImpactIndicatorsInput - Le type d'entrée pour la fonction generateImpactIndicators.
 * - GenerateImpactIndicatorsOutput - Le type de retour pour la fonction generateImpactIndicators.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImpactIndicatorsInputSchema = z.object({
  projectDescription: z
    .string()
    .describe('Une description détaillée du projet pour lequel générer des indicateurs d\'impact.'),
});
export type GenerateImpactIndicatorsInput = z.infer<typeof GenerateImpactIndicatorsInputSchema>;

const GenerateImpactIndicatorsOutputSchema = z.object({
  indicators: z
    .string()
    .describe('Une liste d\'indicateurs clés d\'impact socio-économique pertinents pour le projet.'),
});
export type GenerateImpactIndicatorsOutput = z.infer<typeof GenerateImpactIndicatorsOutputSchema>;

/**
 * Wrapper d'action serveur pour le flux de génération d'indicateurs d'impact.
 */
export async function generateImpactIndicators(
  input: GenerateImpactIndicatorsInput
): Promise<GenerateImpactIndicatorsOutput> {
  return generateImpactIndicatorsFlow(input);
}

/**
 * Définition du prompt pour générer les indicateurs d'impact.
 * Utilisation du nom de modèle recommandé pour Genkit 1.x.
 */
const impactPrompt = ai.definePrompt({
  name: 'generateImpactIndicatorsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: GenerateImpactIndicatorsInputSchema },
  output: { schema: GenerateImpactIndicatorsOutputSchema },
  prompt: `Tu es un expert en évaluation d'impact socio-économique.

Basé sur la description de projet suivante, identifie les indicateurs clés d'impact socio-économique qui peuvent être utilisés pour mesurer et suivre le succès du projet.

Description du Projet : {{{projectDescription}}}

Présente les indicateurs sous forme de liste claire, concise et mesurable.
Considère à la fois les indicateurs quantitatifs et qualitatifs.
Considère également les indicateurs avancés (leading) et retardés (lagging).

Fournis la réponse sous forme de texte bien structuré.`,
});

/**
 * Définition du flux qui exécute le prompt.
 */
const generateImpactIndicatorsFlow = ai.defineFlow(
  {
    name: 'generateImpactIndicatorsFlow',
    inputSchema: GenerateImpactIndicatorsInputSchema,
    outputSchema: GenerateImpactIndicatorsOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await impactPrompt(input);
      
      if (!output) {
        throw new Error("Le modèle n'a pas renvoyé de résultat. Veuillez vérifier la validité de votre clé API.");
      }
      
      return output;
    } catch (error: any) {
      // Propagation de l'erreur détaillée pour le diagnostic
      console.error("Erreur Genkit Flow:", error);
      throw new Error(error.message || "Erreur technique lors de l'appel à l'IA.");
    }
  }
);
