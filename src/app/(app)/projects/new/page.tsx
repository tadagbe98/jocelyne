'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function NewProjectPage() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!userProfile?.companyId) {
            toast({
                variant: 'destructive',
                title: "Erreur",
                description: "Profil utilisateur non chargé ou ID d'entreprise manquant.",
            });
            return;
        }

        setLoading(true);
        const formData = new FormData(event.currentTarget);

        try {
            const projectsRef = collection(firestore, 'companies', userProfile.companyId, 'projects');
            await addDoc(projectsRef, {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                goals: formData.get('goals') as string,
                budget: parseFloat(formData.get('budget') as string || '0'),
                startDate: formData.get('startDate') as string,
                endDate: formData.get('endDate') as string,
                status: formData.get('status') as string,
                methodology: formData.get('methodology') as string,
                tasks: [],
                expenses: [],
                companyId: userProfile.companyId,
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Projet créé !",
                description: "Votre nouveau projet a été ajouté avec succès.",
            });
            router.push('/projects');

        } catch (error) {
            console.error("Error creating project:", error);
            toast({
                variant: 'destructive',
                title: "Erreur de création",
                description: "Une erreur est survenue lors de la création du projet.",
            });
        } finally {
            setLoading(false);
        }
    }


    return (
        <>
            <PageHeader
                title="Nouveau Projet"
                description="Remplissez les détails ci-dessous pour créer un nouveau projet."
                breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: "Nouveau" }]}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Détails du Projet</CardTitle>
                    <CardDescription>
                        Fournissez toutes les informations nécessaires pour votre projet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom du projet</Label>
                                <Input id="name" name="name" placeholder="Ex: Coopérative de couture" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="budget">Budget total (€)</Label>
                                <Input id="budget" name="budget" type="number" placeholder="5000" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" placeholder="Décrivez brièvement le projet..." rows={3} required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="goals">Objectifs</Label>
                            <Textarea id="goals" name="goals" placeholder="Quels sont les objectifs principaux de ce projet ?" rows={3} required/>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Date de début</Label>
                                <Input id="startDate" name="startDate" type="date" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="endDate">Date de fin</Label>
                                <Input id="endDate" name="endDate" type="date" required />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="status">Statut Initial</Label>
                                <Select name="status" defaultValue="Pas commencé">
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pas commencé">Pas commencé</SelectItem>
                                        <SelectItem value="En cours">En cours</SelectItem>
                                        <SelectItem value="En attente">En attente</SelectItem>
                                        <SelectItem value="Terminé">Terminé</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="methodology">Méthodologie</Label>
                                <Select name="methodology" defaultValue="Agile">
                                    <SelectTrigger id="methodology">
                                        <SelectValue placeholder="Sélectionner une méthodologie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Agile">Agile</SelectItem>
                                        <SelectItem value="Cascade">Cascade</SelectItem>
                                        <SelectItem value="Cycle en V">Cycle en V</SelectItem>
                                        <SelectItem value="Hybride">Hybride</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" type="button" onClick={() => router.back()}>Annuler</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Création en cours...' : 'Créer le projet'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    )
}
