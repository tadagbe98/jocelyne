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
import { Check, ChevronsUpDown, Plus, Trash2, CornerDownRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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

function AssigneeCombobox({ companyUsers, assignedUser, onAssigneeChange, usersLoading, disabled }: { companyUsers: UserProfile[], assignedUser?: UserProfile, onAssigneeChange: (id?: string) => void, usersLoading: boolean, disabled?: boolean }) {
    const [open, setOpen] = useState(false);

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '';
        const initials = name.split(' ').map((n) => n[0]).join('');
        return initials.toUpperCase();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[200px] justify-between h-9 font-normal"
                    disabled={usersLoading || disabled}
                >
                    {assignedUser ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Avatar className="w-6 h-6">
                                <AvatarImage src={assignedUser.photoURL || ''} alt={assignedUser.displayName || ''} />
                                <AvatarFallback>{getInitials(assignedUser.displayName)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{assignedUser.displayName}</span>
                        </div>
                    ) : (
                        "Assigner..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Rechercher un employé..." />
                    <CommandList>
                        <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="unassigned"
                                onSelect={() => {
                                    onAssigneeChange(undefined);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        !assignedUser ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                Non assigné
                            </CommandItem>
                            {(companyUsers || []).map((user) => (
                                <CommandItem
                                    key={user.uid}
                                    value={user.displayName || user.email || ''}
                                    onSelect={() => {
                                        onAssigneeChange(user.uid);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            assignedUser?.uid === user.uid ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {user.displayName}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function TasksPage() {
    const { userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [newTaskName, setNewTaskName] = useState('');
    const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
    const [newSubtaskName, setNewSubtaskName] = useState("");

    const isManager = useMemo(() =>
        userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master'),
        [userProfile?.roles]
    );

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

    const hierarchicalTasks = useMemo(() => {
        const tasks = selectedProject?.tasks || [];
        if (tasks.length === 0) return [];

        const taskMap = new Map(tasks.map(t => [t.id, { ...t, children: [] as Task[] }]));
        const roots: Task[] = [];

        for (const task of tasks) {
            if (task.parentId && taskMap.has(task.parentId)) {
                taskMap.get(task.parentId)!.children.push(task);
            } else {
                roots.push(task);
            }
        }

        const flatList: { task: Task, level: number }[] = [];
        function flatten(tasks: Task[], level: number) {
            for (const task of tasks.sort((a,b) => a.name.localeCompare(b.name))) {
                flatList.push({ task, level });
                const children = taskMap.get(task.id)?.children || [];
                if (children.length > 0) {
                    flatten(children, level + 1);
                }
            }
        }
        flatten(roots, 0);
        return flatList;
    }, [selectedProject?.tasks]);

    const getProjectRef = (projectId: string): DocumentReference<Project> | null => {
        if (!userProfile?.companyId) return null;
        return doc(firestore, 'companies', userProfile.companyId, 'projects', projectId) as DocumentReference<Project>;
    }

    const handleAddTask = async (name: string, parentId?: string) => {
        if (!selectedProject || name.trim() === '' || !userProfile) return;
        const projectRef = getProjectRef(selectedProject.id);
        if (!projectRef) return;

        const newTask: Task = {
            id: `t${Date.now()}`,
            name: name.trim(),
            completed: false,
            dueDate: new Date().toISOString().split('T')[0],
            ...(parentId && { parentId }),
        };

        if (!isManager) {
            newTask.assigneeId = userProfile.uid;
        }

        try {
            const updatedTasks = [...(selectedProject.tasks || []), newTask];
            await updateDoc(projectRef, { tasks: updatedTasks });
            toast({ title: "Tâche ajoutée" });
            if (parentId) {
                setAddingSubtaskTo(null);
                setNewSubtaskName('');
            } else {
                setNewTaskName('');
            }
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

        const tasksToRemove = new Set<string>([taskId]);
        const findChildren = (parentId: string) => {
            selectedProject.tasks.forEach(t => {
                if (t.parentId === parentId) {
                    tasksToRemove.add(t.id);
                    findChildren(t.id);
                }
            });
        };
        findChildren(taskId);
        
        try {
            const updatedTasks = selectedProject.tasks.filter(t => !tasksToRemove.has(t.id));
            await updateDoc(projectRef, { tasks: updatedTasks });
            toast({ title: "Tâche supprimée" });
        } catch (error) {
            console.error("Error removing task:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer la tâche." });
        }
    };

    if (userLoading) {
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
                                    placeholder="Nom de la nouvelle tâche principale..."
                                    className="flex-grow"
                                />
                                <Button onClick={() => handleAddTask(newTaskName)}><Plus className="w-4 h-4 mr-2" />Ajouter une tâche</Button>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Fait</TableHead>
                                            <TableHead>Nom de la tâche</TableHead>
                                            <TableHead className="w-auto sm:w-[200px]">Assigné à</TableHead>
                                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hierarchicalTasks.map(({ task, level }) => {
                                            const assignedUser = companyUsers?.find(u => u.uid === task.assigneeId);
                                            const canManageTask = isManager;
                                            const canAddSubtask = isManager || userProfile?.uid === task.assigneeId;
                                            const isAddingSubtask = addingSubtaskTo === task.id;

                                            return (
                                                <React.Fragment key={task.id}>
                                                    <TableRow>
                                                        <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                                                            <Checkbox
                                                                checked={task.completed}
                                                                onCheckedChange={(checked) => handleUpdateTask({ ...task, completed: !!checked })}
                                                                disabled={!canManageTask && userProfile?.uid !== task.assigneeId}
                                                            />
                                                        </TableCell>
                                                        <TableCell className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                                            {task.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <AssigneeCombobox
                                                                companyUsers={companyUsers || []}
                                                                assignedUser={assignedUser}
                                                                usersLoading={usersLoading}
                                                                onAssigneeChange={(newAssigneeId) => handleUpdateTask({ ...task, assigneeId: newAssigneeId })}
                                                                disabled={!canManageTask}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {canAddSubtask && (
                                                                <Button variant="ghost" size="icon" onClick={() => { setAddingSubtaskTo(task.id); setNewSubtaskName(''); }}>
                                                                    <CornerDownRight className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {canManageTask && (
                                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveTask(task.id)}>
                                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    {isAddingSubtask && (
                                                        <TableRow>
                                                            <TableCell colSpan={4} style={{ paddingLeft: `${(level + 1) * 1.5 + 1}rem`, paddingTop: 0, paddingBottom: '1rem' }}>
                                                                <div className="flex gap-2 items-center">
                                                                    <CornerDownRight className="w-4 h-4 text-muted-foreground ml-1" />
                                                                    <Input 
                                                                        value={newSubtaskName}
                                                                        onChange={(e) => setNewSubtaskName(e.target.value)}
                                                                        placeholder="Nom de la sous-tâche"
                                                                        className="h-8"
                                                                        autoFocus
                                                                    />
                                                                    <Button size="sm" onClick={() => handleAddTask(newSubtaskName, task.id)}>Ajouter</Button>
                                                                    <Button size="sm" variant="ghost" onClick={() => setAddingSubtaskTo(null)}>Annuler</Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {hierarchicalTasks.length === 0 && (
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
