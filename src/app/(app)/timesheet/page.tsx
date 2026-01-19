'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { Project } from '@/lib/types';
import { addDoc, collection, query, serverTimestamp } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import React, { useMemo, useState, FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TimesheetPage() {
  const { user, userProfile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());

  const projectsQuery = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return query(
      collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>
    );
  }, [firestore, userProfile?.companyId]);
  const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

  const tasksForSelectedProject = useMemo(() => {
    if (!selectedProject || !projects) return [];
    const project = projects.find(p => p.id === selectedProject);
    return project?.tasks || [];
  }, [selectedProject, projects]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !userProfile?.companyId) {
        toast({ variant: 'destructive', title: "Erreur", description: "Vous devez être connecté." });
        return;
    }
    
    const formData = new FormData(event.currentTarget);
    const hours = parseFloat(formData.get('hours') as string);
    if (isNaN(hours) || hours <= 0) {
        toast({ variant: 'destructive', title: "Erreur", description: "Veuillez entrer un nombre d'heures valide." });
        return;
    }

    setLoading(true);

    try {
        const timesheetsRef = collection(firestore, 'companies', userProfile.companyId, 'timesheets');
        await addDoc(timesheetsRef, {
            userId: user.uid,
            projectId: formData.get('projectId') as string,
            taskId: formData.get('taskId') as string,
            date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            hours: hours,
            notes: formData.get('notes') as string,
            companyId: userProfile.companyId,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Feuille de temps enregistrée !" });
        (event.target as HTMLFormElement).reset();
        setSelectedProject('');
        setDate(new Date());

    } catch (error) {
        console.error("Error creating timesheet entry:", error);
        toast({
            variant: 'destructive',
            title: "Erreur",
            description: "Impossible d'enregistrer l'entrée.",
        });
    } finally {
        setLoading(false);
    }
  }


  return (
    <>
      <PageHeader
        title="Feuille de temps"
        description="Suivez et enregistrez le temps passé sur vos projets."
      />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Nouvelle Entrée</CardTitle>
                        <CardDescription>Renseignez les détails de votre travail.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="project">Projet</Label>
                             <Select name="projectId" required onValueChange={setSelectedProject} value={selectedProject}>
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Sélectionner un projet" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectsLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                    projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="task">Tâche</Label>
                             <Select name="taskId" required disabled={!selectedProject}>
                                <SelectTrigger id="task">
                                    <SelectValue placeholder="Sélectionner une tâche" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasksForSelectedProject.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                            {date ? format(date, "PPP", { weekStartsOn: 1 }) : <span>Choisir une date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hours">Heures</Label>
                                <Input id="hours" name="hours" type="number" step="0.5" min="0" required placeholder="Ex: 2.5"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" name="notes" placeholder="Décrivez le travail effectué... (optionnel)" />
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={loading || projectsLoading}>
                            {loading ? "Enregistrement..." : "Enregistrer le temps"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
        <div className="md:col-span-2">
            {/* Here I would list the recent timesheet entries for the user */}
            <Card>
                <CardHeader>
                    <CardTitle>Mes Entrées Récentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">La liste des feuilles de temps sera bientôt disponible ici.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
