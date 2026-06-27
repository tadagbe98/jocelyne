
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithGoogle, signInWithEmail } from '@/firebase/auth/auth';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import Logo from '@/components/logo';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import { motion } from 'framer-motion';

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C41.38,36.401,44,30.63,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
        </svg>
    )
}

export default function LoginPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormLoading(true);
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            await signInWithEmail(email, password);
        } catch (error) {
            let errorMessage = "Impossible de se connecter.";
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "Email ou mot de passe incorrect.";
                }
            }
            toast({
                variant: 'destructive',
                title: 'Erreur de connexion',
                description: errorMessage,
            });
        } finally {
            setFormLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setFormLoading(true);
            await signInWithGoogle();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erreur Google',
                description: "La connexion avec Google a échoué.",
            });
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen w-full bg-background px-4 relative overflow-hidden">
            {/* Design blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                <Card className="glass-card border-none shadow-2xl overflow-hidden p-4">
                    <CardHeader className="text-center pb-8">
                        <div className="flex justify-center mb-6">
                            <motion.div 
                                whileHover={{ rotate: 10 }}
                                className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/30"
                            >
                                <Logo className="size-12 text-white" />
                            </motion.div>
                        </div>
                        <CardTitle className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary to-purple-800">
                            PROJEXIA
                        </CardTitle>
                        <CardDescription className="text-lg mt-2">Connectez-vous pour piloter l'impact.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <form onSubmit={handleEmailLogin} className="grid gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input id="email" name="email" type="email" placeholder="admin@votreentreprise.com" className="bg-background/50 border-primary/10 h-12" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input id="password" name="password" type="password" className="bg-background/50 border-primary/10 h-12" required />
                            </div>
                            <Button type="submit" className="w-full h-12 text-lg font-bold premium-shadow mirror-effect" disabled={loading || formLoading}>
                               {formLoading ? 'Connexion...' : 'Accéder au tableau de bord'}
                            </Button>
                        </form>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-primary/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-3 bg-transparent text-muted-foreground font-semibold">
                                    OU CONTINUER AVEC
                                </span>
                            </div>
                        </div>
                         <Button
                            variant="outline"
                            className="w-full h-12 glass-card hover:bg-primary/5 border-primary/10"
                            onClick={handleGoogleLogin}
                            disabled={loading || formLoading}
                        >
                           <GoogleIcon />
                            <span className="ml-3 font-semibold">Google Workspace</span>
                        </Button>
                         <p className="text-sm text-center text-muted-foreground mt-4">
                            Nouveau sur Projexia ?{' '}
                            <Link
                                href="/signup"
                                className="text-primary font-bold hover:underline"
                            >
                                Créer une entreprise
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
