'use client'

import { notFound, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CircleDollarSign, ListChecks, Plus, Trash2, Workflow } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useMemo, useState } from 'react';
import { Expense, Project, Task, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { collection, doc, DocumentReference, updateDoc, arrayUnion, arrayRemove, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

function ProjectPlan({ project, projectRef, toast }: { project: Project, projectRef: DocumentReference<Project>, toast: ReturnType<typeof useToast>['toast'] }) {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    
    const companyUsersQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
            collection(firestore, 'users') as collection<UserProfile>,
            where('companyId', '==', userProfile.companyId)
        );
    }, [firestore, userProfile?.companyId]);
    const { data: companyUsers, loading: usersLoading } = useCollection<UserProfile>(companyUsersQuery);

    const [newTask, setNewTask] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>();

    const handleAddTask = async () => {
        if (newTask.trim() === '') return;
        const newTaskObject: Task = {
            id: `t${Date.now()}`, // Simple unique ID
            name: newTask.trim(),
            completed: false,
            dueDate: new Date().toISOString().split('T')[0],
            assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId
        };
        try {
            await updateDoc(projectRef, {
                tasks: arrayUnion(newTaskObject)
            });
            setNewTask('');
            setAssigneeId(undefined);
        } catch (error) {
            console.error("Error adding task:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Impossible d'ajouter la tâche. Vérifiez vos permissions.",
            });
        }
    };

    const toggleTask = async (task: Task) => {
        const updatedTasks = project.tasks.map(t =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
        );
        try {
            await updateDoc(projectRef, { tasks: updatedTasks });
        } catch (error) {
            console.error("Error toggling task:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Impossible de modifier la tâche. Veuillez réessayer.",
            });
        }
    };
    
    const handleRemoveTask = async (taskId: string) => {
        const taskToRemove = project.tasks.find(t => t.id === taskId);
        if (!taskToRemove) return;
        try {
            await updateDoc(projectRef, {
                tasks: arrayRemove(taskToRemove)
            });
        } catch (error) {
            console.error("Error removing task:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Impossible de supprimer la tâche. Veuillez réessayer.",
            });
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '';
        const initials = name.split(' ').map((n) => n[0]).join('');
        return initials.toUpperCase();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plan de projet (To-do list)</CardTitle>
                <CardDescription>Organisez et assignez les activités de votre projet.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2 mb-4 sm:flex-row">
                    <Input 
                        value={newTask} 
                        onChange={(e) => setNewTask(e.target.value)} 
                        placeholder="Ajouter une nouvelle tâche..." 
                        className="flex-grow"
                    />
                    <Select onValueChange={setAssigneeId} value={assigneeId || ''}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Assigner à..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Non assigné</SelectItem>
                            {usersLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                            (companyUsers || []).map(user => (
                                <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddTask} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
                </div>
                <div className="space-y-2">
                    <TooltipProvider>
                        {project.tasks.map(task => {
                            const assignedUser = companyUsers?.find(u => u.uid === task.assigneeId);
                            return (
                                <div key={task.id} className="flex items-center p-2 rounded-md hover:bg-muted/50">
                                    <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task)} className="mr-4" />
                                    <label htmlFor={`task-${task.id}`} className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {task.name}
                                    </label>
                                    
                                    {assignedUser && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="w-6 h-6 ml-auto mr-2">
                                                    <AvatarImage src={assignedUser.photoURL || ''} alt={assignedUser.displayName || ''} />
                                                    <AvatarFallback>{getInitials(assignedUser.displayName)}</AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Assigné à {assignedUser.displayName}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}

                                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handleRemoveTask(task.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            )
                        })}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}

function ProjectBudget({ project }: { project: Project }) {
    const spent = project.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = (project.budget || 0) - spent;
    const progress = project.budget ? (spent / project.budget) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Suivi du Budget</CardTitle>
                <CardDescription>Gardez un œil sur vos finances.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <div className="grid gap-2">
                        <div className="flex justify-between font-semibold">
                            <span>Dépensé</span>
                            <span>{spent.toLocaleString('fr-FR')} €</span>
                        </div>
                        <Progress value={progress} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Restant: {remaining.toLocaleString('fr-FR')} €</span>
                            <span>Total: {(project.budget || 0).toLocaleString('fr-FR')} €</span>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {project.expenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.item}</TableCell>
                                    <TableCell>{new Date(expense.date).toLocaleDateString('fr-FR')}</TableCell>
                                    <TableCell className="text-right">{expense.amount.toLocaleString('fr-FR')} €</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function ProjectDetailsLoading() {
    return (
        <>
            <PageHeader
                title={<Skeleton className="h-10 w-1/2" />}
                description={<Skeleton className="h-4 w-3/4 mt-2" />}
                actions={<Skeleton className="h-8 w-24" />}
            />
             <Tabs defaultValue="overview">
                <TabsList className="mb-6">
                    <TabsTrigger value="overview">Aperçu</TabsTrigger>
                    <TabsTrigger value="plan">Plan de projet</TabsTrigger>
                    <TabsTrigger value="budget">Budget</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Objectifs du projet</CardTitle></CardHeader>
                                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Progression</CardTitle></CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-1/2 mb-2" />
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                           <Card>
                               <CardHeader><CardTitle>Informations Clés</CardTitle></CardHeader>
                               <CardContent className="space-y-6">
                                   <Skeleton className="h-12 w-full" />
                                   <Skeleton className="h-12 w-full" />
                                   <Skeleton className="h-12 w-full" />
                               </CardContent>
                           </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </>
    );
}


export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
    const { userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { id: projectId } = params;

    const projectRef = useMemo(() => {
        if (!userProfile?.companyId || !projectId) return null;
        return doc(
            firestore, 
            'companies', 
            userProfile.companyId, 
            'projects', 
            projectId
        ) as DocumentReference<Project>;
    }, [firestore, userProfile?.companyId, projectId]);

    const { data: project, loading: projectLoading } = useDoc<Project>(projectRef);
    
    if (userLoading || projectLoading) {
        return <ProjectDetailsLoading />;
    }

    if (!project) {
        notFound();
    }

    const getStatusVariant = (status: string): "secondary" | "outline" | "default" | "destructive" => {
        switch (status) {
            case 'Terminé': return 'secondary';
            case 'En attente': return 'outline';
            case 'En cours': return 'default';
            default: return 'default';
        }
    }
    
    const progress = project.tasks.length > 0 ? (project.tasks.filter(t => t.completed).length / project.tasks.length) * 100 : 0;


    return (
        <>
            <PageHeader
                title={project.name}
                description={project.description}
                actions={<Badge variant={getStatusVariant(project.status)} className="text-sm">{project.status}</Badge>}
            />

            <Tabs defaultValue="overview">
                <TabsList className="mb-6">
                    <TabsTrigger value="overview">Aperçu</TabsTrigger>
                    <TabsTrigger value="plan">Plan de projet</TabsTrigger>
                    <TabsTrigger value="budget">Budget</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Objectifs du projet</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">{project.goals}</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Progression</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-center mb-2">
                                        <ListChecks className="w-5 h-5 mr-2 text-primary" />
                                        <span>{project.tasks.filter(t => t.completed).length} / {project.tasks.length} tâches terminées</span>
                                    </div>
                                    <Progress value={progress} />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                           <Card>
                               <CardHeader><CardTitle>Informations Clés</CardTitle></CardHeader>
                               <CardContent className="space-y-4">
                                   <div className="flex items-start">
                                       <Calendar className="w-5 h-5 mr-3 mt-1 text-primary"/>
                                       <div>
                                           <p className="font-semibold">Échéancier</p>
                                           <p className="text-sm text-muted-foreground">{new Date(project.startDate).toLocaleDateString('fr-FR')} - {new Date(project.endDate).toLocaleDateString('fr-FR')}</p>
                                       </div>
                                   </div>
                                   <div className="flex items-start">
                                       <CircleDollarSign className="w-5 h-5 mr-3 mt-1 text-primary"/>
                                       <div>
                                           <p className="font-semibold">Budget Total</p>
                                           <p className="text-sm text-muted-foreground">{(project.budget || 0).toLocaleString('fr-FR')} €</p>
                                       </div>
                                   </div>
                                   <div className="flex items-start">
                                       <Workflow className="w-5 h-5 mr-3 mt-1 text-primary"/>
                                       <div>
                                           <p className="font-semibold">Méthodologie</p>
                                           <p className="text-sm text-muted-foreground">{project.methodology}</p>
                                       </div>
                                   </div>
                               </CardContent>
                           </Card>
                        </div>
                    </div>
                </TabsContent>
                
                <TabsContent value="plan">
                    <ProjectPlan project={project} projectRef={projectRef!} toast={toast} />
                </TabsContent>

                <TabsContent value="budget">
                    <ProjectBudget project={project} />
                </TabsContent>
            </Tabs>
        </>
    );
}
