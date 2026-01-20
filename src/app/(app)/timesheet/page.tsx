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
import { Project, Timesheet, UserProfile } from '@/lib/types';
import { addDoc, collection, query, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import React, { useMemo, useState, FormEvent, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TimesheetPage() {
  const { user, userProfile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.uid);
    }
  }, [user]);

  const companyUsersQuery = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return query(
      collection(firestore, 'users') as collection<UserProfile>,
      where('companyId', '==', userProfile.companyId)
    );
  }, [firestore, userProfile?.companyId]);
  const { data: companyUsers, loading: usersLoading } = useCollection<UserProfile>(companyUsersQuery);

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

  const timesheetQuery = useMemo(() => {
    if (!userProfile?.companyId || !selectedUserId) return null;
    return query(
        collection(firestore, 'companies', userProfile.companyId, 'timesheets') as collection<Timesheet>,
        where('userId', '==', selectedUserId),
        orderBy('createdAt', 'desc'),
        limit(10)
    );
  }, [firestore, userProfile?.companyId, selectedUserId]);
  const { data: timesheets, loading: timesheetsLoading } = useCollection<Timesheet>(timesheetQuery);
  
  const getProjectName = (projectId: string) => projects?.find(p => p.id === projectId)?.name ?? projectId;
  const getTaskName = (projectId: string, taskId: string) => {
      const project = projects?.find(p => p.id === projectId);
      return project?.tasks.find(t => t.id === taskId)?.name ?? taskId;
  };

  const handleProjectChange = (projectId: string) => {
      setSelectedProject(projectId);
      setSelectedTask('');
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const userId = formData.get('userId') as string;

    if (!userId || !userProfile?.companyId) {
        toast({ variant: 'destructive', title: "Erreur", description: "Veuillez sélectionner un employé." });
        return;
    }
    
    const hours = parseFloat(formData.get('hours') as string);
    if (isNaN(hours) || hours <= 0) {
        toast({ variant: 'destructive', title: "Erreur", description: "Veuillez entrer un nombre d'heures valide." });
        return;
    }

    setLoading(true);

    try {
        const timesheetsRef = collection(firestore, 'companies', userProfile.companyId, 'timesheets');
        await addDoc(timesheetsRef, {
            userId: userId,
            projectId: formData.get('projectId') as string,
            taskId: formData.get('taskId') as string,
            date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            hours: hours,
            notes: formData.get('notes') as string,
            companyId: userProfile.companyId,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Feuille de temps enregistrée !" });
        setSelectedProject('');
        setSelectedTask('');
        (event.target as HTMLFormElement).querySelector('textarea[name="notes"]')?.value = '';
        (event.target as HTMLFormElement).querySelector('input[name="hours"]')?.value = '';

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
                            <Label htmlFor="employee">Employé</Label>
                            <Select name="userId" required onValueChange={setSelectedUserId} value={selectedUserId}>
                                <SelectTrigger id="employee">
                                    <SelectValue placeholder="Sélectionner un employé" />
                                </SelectTrigger>
                                <SelectContent>
                                    {usersLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                    (companyUsers ?? []).map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project">Projet</Label>
                             <Select name="projectId" required onValueChange={handleProjectChange} value={selectedProject}>
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Sélectionner un projet" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectsLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                    (projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="task">Tâche</Label>
                             <Select name="taskId" required disabled={!selectedProject} onValueChange={setSelectedTask} value={selectedTask}>
                                <SelectTrigger id="task">
                                    <SelectValue placeholder="Sélectionner une tâche" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasksForSelectedProject.length > 0 ?
                                        tasksForSelectedProject.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                        :
                                        <SelectItem value="no-task" disabled>
                                            {selectedProject ? "Aucune tâche pour ce projet" : "Sélectionner un projet d'abord"}
                                        </SelectItem>
                                    }
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
                        <Button type="submit" disabled={loading || projectsLoading || usersLoading}>
                            {loading ? "Enregistrement..." : "Enregistrer le temps"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Entrées Récentes de {(companyUsers?.find(u => u.uid === selectedUserId)?.displayName) || 'l\'employé'}</CardTitle>
                </CardHeader>
                <CardContent>
                     {timesheetsLoading ? <p>Chargement...</p> :
                    (timesheets && timesheets.length > 0) ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Projet</TableHead>
                                    <TableHead>Tâche</TableHead>
                                    <TableHead className="text-right">Heures</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timesheets.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{getProjectName(entry.projectId)}</TableCell>
                                        <TableCell>{getTaskName(entry.projectId, entry.taskId)}</TableCell>
                                        <TableCell className="text-right">{entry.hours}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground">Aucune entrée récente pour cet employé.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}
