'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpWithCompany } from '@/firebase/auth/auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const companyName = formData.get('companyName') as string;
        const creationYear = formData.get('creationYear') as string;
        const country = formData.get('country') as string;
        const currency = formData.get('currency') as string;
        const language = formData.get('language') as string;

        try {
            await signUpWithCompany(email, password, fullName, {
                name: companyName,
                creationYear: parseInt(creationYear),
                country,
                currency,
                language,
            });
            toast({
                title: "Compte créé avec succès !",
                description: "Vous allez être redirigé vers le tableau de bord.",
            });
            router.push('/dashboard');
        } catch (err: unknown) {
            let errorMessage = "Une erreur est survenue.";
            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = "Cette adresse e-mail est déjà utilisée.";
                        break;
                    case 'auth/weak-password':
                        errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = "L'inscription par e-mail/mot de passe n'est pas activée. Veuillez l'activer dans la console Firebase (Authentication > Sign-in method).";
                        break;
                    default:
                        errorMessage = "Erreur d'authentification: " + err.message;
                }
            }
             else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Erreur lors de l\'inscription',
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid w-full min-h-screen place-items-center bg-background px-4 py-12">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Créer un compte pour votre entreprise</CardTitle>
                    <CardDescription>
                        Remplissez les informations ci-dessous pour commencer à gérer vos projets.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                                <Label htmlFor="fullName">Nom et Prénoms</Label>
                                <Input id="fullName" name="fullName" placeholder="John Doe" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input id="email" name="email" type="email" placeholder="admin@votreentreprise.com" required />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        
                        <div className="w-full h-px my-2 bg-border" />

                        <div className="grid gap-4 md:grid-cols-2">
                             <div className="space-y-2">
                                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                                <Input id="companyName" name="companyName" placeholder="Ma Super Entreprise" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="creationYear">Année de création</Label>
                                <Input id="creationYear" name="creationYear" type="number" placeholder="2024" required />
                            </div>
                        </div>

                         <div className="grid gap-4 md:grid-cols-3">
                             <div className="space-y-2">
                                <Label htmlFor="country">Pays</Label>
                                <Input id="country" name="country" placeholder="France" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="currency">Devise</Label>
                                <Select name="currency" defaultValue="XOF" required>
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Sélectionner une devise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="XOF">Franc CFA (XOF)</SelectItem>
                                        <SelectItem value="EUR">Euro (€)</SelectItem>
                                        <SelectItem value="USD">Dollar Américain ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="language">Langue</Label>
                                <Input id="language" name="language" placeholder="Français" required />
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Création en cours...' : 'Créer mon compte'}
                        </Button>

                         <p className="px-8 text-sm text-center text-muted-foreground">
                            Vous avez déjà un compte ?{' '}
                            <Link
                                href="/login"
                                className="underline underline-offset-4 hover:text-primary"
                            >
                                Se connecter
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
