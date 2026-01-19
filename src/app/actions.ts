'use server';

import { generateImpactIndicators } from '@/ai/flows/generate-impact-indicators';
import { z } from 'zod';

const ImpactSchema = z.object({
  projectDescription: z.string().min(50, "La description doit contenir au moins 50 caractères."),
});

export type FormState = {
  data: { indicators: string } | null;
  error: Record<string, string[] | undefined> | string | null;
  message?: string;
};

export async function getImpactIndicatorsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = ImpactSchema.safeParse({
    projectDescription: formData.get('projectDescription'),
  });

  if (!validatedFields.success) {
    return {
      data: null,
      error: validatedFields.error.flatten().fieldErrors,
      message: "Erreur de validation."
    };
  }

  try {
    const result = await generateImpactIndicators({
      projectDescription: validatedFields.data.projectDescription,
    });
    return { data: result, error: null, message: "Indicateurs générés avec succès." };
  } catch (error) {
    console.error(error);
    return { data: null, error: "Une erreur est survenue lors de la génération des indicateurs.", message: "Erreur du serveur." };
  }
}
