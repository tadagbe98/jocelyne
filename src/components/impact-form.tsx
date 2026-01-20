'use client';

import { useFormStatus } from 'react-dom';
import { getImpactIndicatorsAction, type FormState } from '@/app/actions';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { useActionState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Génération en cours...' : 'Générer les indicateurs'}
    </Button>
  );
}

export function ImpactForm() {
  const initialState: FormState = { data: null, error: null };
  const [state, formAction] = useActionState(getImpactIndicatorsAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if(state.error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: typeof state.error === 'string' ? state.error : "Veuillez corriger les erreurs dans le formulaire.",
      });
    }
    if (state.data) {
      toast({
        title: "Succès",
        description: "Les indicateurs d'impact ont été générés.",
      });
      formRef.current?.reset();
    }
  }, [state, toast]);

  const descriptionErrors = typeof state.error === 'object' && state.error?.projectDescription;

  return (
    <Card>
      <form ref={formRef} action={formAction}>
        <CardHeader>
          <CardTitle>Générateur d'Indicateurs d'Impact</CardTitle>
          <CardDescription>
            Décrivez votre projet en détail pour que l'IA identifie les indicateurs socio-économiques pertinents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="projectDescription"
            placeholder="Ex: Mon projet est une coopérative de couture qui vise à autonomiser 20 femmes dans le quartier de Yopougon en leur fournissant une formation, un accès au marché et des revenus stables..."
            rows={8}
            required
            className={descriptionErrors ? 'border-destructive' : ''}
          />
          {descriptionErrors && (
            <p className="text-sm text-destructive mt-2">{descriptionErrors[0]}</p>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
      {state.data && (
        <CardContent>
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Indicateurs d'Impact Suggérés</AlertTitle>
                <AlertDescription>
                    <pre className="mt-2 whitespace-pre-wrap font-body text-sm">
                        {state.data.indicators}
                    </pre>
                </AlertDescription>
            </Alert>
        </CardContent>
      )}
    </Card>
  );
}
