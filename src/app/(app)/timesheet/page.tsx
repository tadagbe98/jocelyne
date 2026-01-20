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
import { useCollection } from '@/firebase/firestore/use-collection';

function TimesheetForm({ onEntryAdded, projects, projectsLoading, viewedUserId, onUserChange }) {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  const companyUsersQuery = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return query(
      collection(firestore, 'users') as collection<UserProfile>,
      where('companyId', '==', userProfile.companyId),
      where('status', '==', 'active')
    );
  }, [firestore, userProfile?.companyId]);
  const { data: companyUsers, loading: usersLoading } = useCollection<UserProfile>(companyUsersQuery);

  const isManager = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master');

  const tasksForSelectedProject = useMemo(() => {
    if (!selectedProject || !projects) return [];
    const project = projects.find(p => p.id === selectedProject);
    return project?.tasks || [];
  }, [selectedProject, projects]);
  
  useEffect(() => {
    setSelectedTask('');
  }, [selectedProject])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userIdToSubmit = isManager ? viewedUserId : user?.uid;

    if (!userIdToSubmit) {
        toast({ variant: 'destructive', title: "Erreur", description: "Utilisateur non valide." });
        return;
    }
    
    const hoursNumber = parseFloat(hours);
    if (isNaN(hoursNumber) || hoursNumber <= 0) {
        toast({ variant: 'destructive', title: "Erreur", description: "Veuillez entrer un nombre d'heures valide." });
        return;
    }
    
    if (!selectedProject || !selectedTask) {
        toast({ variant: 'destructive', title: "Erreur", description: "Veuillez sélectionner un projet et une tâche." });
        return;
    }

    setLoading(true);

    try {
        const timesheetsRef = collection(firestore, 'companies', userProfile.companyId, 'timesheets');
        await addDoc(timesheetsRef, {
            userId: userIdToSubmit,
            projectId: selectedProject,
            taskId: selectedTask,
            date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
            hours: hoursNumber,
            notes: notes,
            companyId: userProfile.companyId,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Feuille de temps enregistrée !" });
        setSelectedProject('');
        setSelectedTask('');
        setHours('');
        setNotes('');
        setDate(new Date());

        onEntryAdded(userIdToSubmit);
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
    <Card>
        <form onSubmit={handleSubmit}>
            <CardHeader>
                <CardTitle>Nouvelle Entrée</CardTitle>
                <CardDescription>Renseignez les détails de votre travail.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {isManager && (
                    <div className="space-y-2">
                        <Label htmlFor="employee">Employé</Label>
                        <Select name="userId" required onValueChange={onUserChange} value={viewedUserId}>
                            <SelectTrigger id="employee">
                                <SelectValue placeholder="Sélectionner un employé" />
                            </SelectTrigger>
                            <SelectContent>
                                {usersLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                (companyUsers ?? []).map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="project">Projet</Label>
                     <Select name="projectId" required onValueChange={setSelectedProject} value={selectedProject}>
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
                        <Input id="hours" name="hours" type="number" step="0.5" min="0" required placeholder="Ex: 2.5" value={hours} onChange={e => setHours(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Décrivez le travail effectué... (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={loading || projectsLoading || usersLoading}>
                    {loading ? "Enregistrement..." : "Enregistrer le temps"}
                </Button>
            </CardFooter>
        </form>
    </Card>
  )
}

function RecentEntriesList({ projects, selectedUserId }) {
    const { userProfile } = useUser();
    const firestore = useFirestore();

    const timesheetQuery = useMemo(() => {
        if (!userProfile?.companyId || !selectedUserId) return null;
        return query(
            collection(firestore, 'companies', userProfile.companyId, 'timesheets') as collection<Timesheet>,
            where('userId', '==', selectedUserId),
            orderBy('date', 'desc'),
            limit(10)
        );
    }, [firestore, userProfile?.companyId, selectedUserId]);
    const { data: timesheets, loading: timesheetsLoading } = useCollection<Timesheet>(timesheetQuery);

    const getProjectName = (projectId: string) => projects?.find(p => p.id === projectId)?.name ?? projectId;
    const getTaskName = (projectId: string, taskId: string) => {
        const project = projects?.find(p => p.id === projectId);
        return project?.tasks.find(t => t.id === taskId)?.name ?? taskId;
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Entrées Récentes</CardTitle>
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
                    <p className="text-muted-foreground">Aucune entrée de temps récente pour cet utilisateur.</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function TimesheetPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();

    // This state will control which user's data is displayed
    const [viewedUserId, setViewedUserId] = useState<string | undefined>();

    // Initialize with the current user's ID, or when the user loads
    useEffect(() => {
        if (user && !viewedUserId) {
            setViewedUserId(user.uid);
        }
    }, [user, viewedUserId]);

    const projectsQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>
        );
    }, [firestore, userProfile?.companyId]);
    const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

  return (
    <>
      <PageHeader
        title="Feuille de temps"
        description="Suivez et enregistrez le temps passé sur vos projets."
      />

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <TimesheetForm 
                onEntryAdded={setViewedUserId} // When an entry is added, view that user's sheet
                projects={projects ?? []}
                projectsLoading={projectsLoading}
                viewedUserId={viewedUserId}
                onUserChange={setViewedUserId} // When manager changes selection, update view
            />
        </div>
        <div className="md:col-span-2">
            <RecentEntriesList projects={projects ?? []} selectedUserId={viewedUserId} />
        </div>
      </div>
    </>
  );
}
