'use client';

import { PageHeader } from "@/components/page-header";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useFirestore } from "@/firebase/provider";
import { collection, doc, DocumentReference, query, updateDoc, where } from "firebase/firestore";
import { Project, Task, UserProfile } from "@/lib/types";
import { useCollection } from "@/firebase/firestore/use-collection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function TasksLoading() {
    return (
        <>
            <PageHeader title="Gestion des Tâches" description="Ajoutez et assignez des tâches à vos projets." />
            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-6 w-1/4" /></CardTitle>
                    <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-1/3" />
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"><Skeleton className="h-5 w-5" /></TableHead>
                                        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}


export default function TasksPage() {
    const { userProfile, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [newTaskName, setNewTaskName] = useState('');

    const isAuthorized = useMemo(() => 
        userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master'),
        [userProfile?.roles]
    );

    useEffect(() => {
        if (!userLoading && !isAuthorized) {
            router.push('/dashboard');
        }
    }, [userLoading, isAuthorized, router]);

    const projectsQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>
        );
    }, [firestore, userProfile?.companyId]);
    const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

    const companyUsersQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
            collection(firestore, 'users'),
            where('companyId', '==', userProfile.companyId)
        );
    }, [firestore, userProfile?.companyId]);
    const { data: companyUsers, loading: usersLoading } = useCollection<UserProfile>(companyUsersQuery);

    const selectedProject = useMemo(() => {
        return projects.find(p => p.id === selectedProjectId) ?? null;
    }, [projects, selectedProjectId]);

    const getProjectRef = (projectId: string): DocumentReference<Project> | null => {
        if (!userProfile?.companyId) return null;
        return doc(firestore, 'companies', userProfile.companyId, 'projects', projectId) as DocumentReference<Project>;
    }

    const handleAddTask = async () => {
        if (!selectedProject || newTaskName.trim() === '') return;

        const projectRef = getProjectRef(selectedProject.id);
        if (!projectRef) return;

        const newTaskObject: Task = {
            id: `t${Date.now()}`,
            name: newTaskName.trim(),
            completed: false,
            dueDate: new Date().toISOString().split('T')[0], // Default due date
        };
        
        try {
            const updatedTasks = [...(selectedProject.tasks || []), newTaskObject];
            await updateDoc(projectRef, { tasks: updatedTasks });
            toast({ title: "Tâche ajoutée", description: `La tâche "${newTaskName}" a été ajoutée au projet ${selectedProject.name}.`});
            setNewTaskName('');
        } catch (error) {
            console.error("Error adding task:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'ajouter la tâche." });
        }
    };
    
    const handleUpdateTask = async (updatedTask: Task) => {
        if (!selectedProject) return;
        const projectRef = getProjectRef(selectedProject.id);
        if (!projectRef) return;

        try {
            const updatedTasks = selectedProject.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
            await updateDoc(projectRef, { tasks: updatedTasks });
        } catch (error) {
            console.error("Error updating task:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour la tâche." });
        }
    };

    const handleRemoveTask = async (taskId: string) => {
        if (!selectedProject) return;
        const projectRef = getProjectRef(selectedProject.id);
        if (!projectRef) return;

        try {
            const updatedTasks = selectedProject.tasks.filter(t => t.id !== taskId);
            await updateDoc(projectRef, { tasks: updatedTasks });
            toast({ title: "Tâche supprimée" });
        } catch (error) {
            console.error("Error removing task:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer la tâche." });
        }
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '';
        const initials = name.split(' ').map((n) => n[0]).join('');
        return initials.toUpperCase();
    };

    if (userLoading || !isAuthorized) {
        return <TasksLoading />;
    }

    return (
        <>
            <PageHeader
                title="Gestion des Tâches"
                description="Ajoutez, assignez et suivez les tâches de tous vos projets."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Sélectionner un projet</CardTitle>
                    <CardDescription>Choisissez un projet pour voir et gérer ses tâches.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Select onValueChange={setSelectedProjectId} disabled={projectsLoading}>
                        <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                            <SelectValue placeholder={projectsLoading ? "Chargement..." : "Sélectionner un projet"} />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map(project => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedProject && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold tracking-tight">Tâches pour : {selectedProject.name}</h3>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input 
                                    value={newTaskName}
                                    onChange={(e) => setNewTaskName(e.target.value)}
                                    placeholder="Nom de la nouvelle tâche..."
                                    className="flex-grow"
                                />
                                <Button onClick={handleAddTask}><Plus className="w-4 h-4 mr-2"/>Ajouter une tâche</Button>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Fait</TableHead>
                                            <TableHead>Nom de la tâche</TableHead>
                                            <TableHead className="w-[200px]">Assigné à</TableHead>
                                            <TableHead className="text-right w-[50px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedProject.tasks || []).map(task => {
                                            const assignedUser = companyUsers?.find(u => u.uid === task.assigneeId);
                                            return (
                                                <TableRow key={task.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={task.completed}
                                                            onCheckedChange={(checked) => handleUpdateTask({ ...task, completed: !!checked })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                                        {task.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={task.assigneeId || 'unassigned'}
                                                            onValueChange={(newAssigneeId) => handleUpdateTask({ ...task, assigneeId: newAssigneeId === 'unassigned' ? undefined : newAssigneeId })}
                                                            disabled={usersLoading}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                {assignedUser ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="w-6 h-6">
                                                                            <AvatarImage src={assignedUser.photoURL || ''} alt={assignedUser.displayName || ''} />
                                                                            <AvatarFallback>{getInitials(assignedUser.displayName)}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span>{assignedUser.displayName}</span>
                                                                    </div>
                                                                ) : (
                                                                    <SelectValue placeholder="Assigner..." />
                                                                )}
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="unassigned">Non assigné</SelectItem>
                                                                {(companyUsers || []).map(user => (
                                                                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTask(task.id)}>
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {selectedProject.tasks?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    Aucune tâche pour ce projet. Commencez par en ajouter une !
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
