'use client'

import { notFound, useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar, CircleDollarSign, ListChecks, Plus, Trash2, Workflow } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useMemo, useState } from 'react';
import { Company, Expense, Project, Task, UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { collection, doc, DocumentReference, updateDoc, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function ProjectPlan({ project }: { project: Project }) {
    const { userProfile } = useUser();
    const isManager = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Plan de projet</CardTitle>
                        <CardDescription>Liste des tâches prévues pour ce projet.</CardDescription>
                    </div>
                    {isManager && (
                        <Link href="/tasks" className={buttonVariants({ variant: "outline" })}>
                            Gérer les tâches
                            <ListChecks className="w-4 h-4 ml-2" />
                        </Link>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {(project.tasks || []).map(task => (
                        <li key={task.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                            <Checkbox id={`task-${task.id}`} checked={task.completed} disabled />
                            <label htmlFor={`task-${task.id}`} className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.name}
                            </label>
                        </li>
                    ))}
                    {(project.tasks?.length === 0 || !project.tasks) && (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche définie pour ce projet.</p>
                    )}
                </ul>
            </CardContent>
        </Card>
    );
}

function ProjectBudget({ project, company }: { project: Project; company: Company | null }) {
    const spent = project.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = (project.budget || 0) - spent;
    const progress = project.budget ? (spent / project.budget) * 100 : 0;
    const currency = company?.currency || 'EUR';

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
                            <span>{spent.toLocaleString('fr-FR', { style: 'currency', currency })}</span>
                        </div>
                        <Progress value={progress} />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Restant: {remaining.toLocaleString('fr-FR', { style: 'currency', currency })}</span>
                            <span>Total: {(project.budget || 0).toLocaleString('fr-FR', { style: 'currency', currency })}</span>
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
                                    <TableCell className="text-right">{expense.amount.toLocaleString('fr-FR', { style: 'currency', currency })}</TableCell>
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
                breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: "Chargement..." }]}
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


export default function ProjectDetailsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

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

    const companyRef = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return doc(firestore, 'companies', userProfile.companyId) as DocumentReference<Company>;
    }, [firestore, userProfile?.companyId]);
    const { data: company, loading: companyLoading } = useDoc<Company>(companyRef);
    
    if (userLoading || projectLoading || companyLoading) {
        return <ProjectDetailsLoading />;
    }

    if (!project || !company) {
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
                breadcrumbs={[{ label: "Projets", href: "/projects" }, { label: project.name }]}
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
                                           <p className="text-sm text-muted-foreground">{(project.budget || 0).toLocaleString('fr-FR', { style: 'currency', currency: company.currency })}</p>
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
                    <ProjectPlan project={project} />
                </TabsContent>

                <TabsContent value="budget">
                    <ProjectBudget project={project} company={company} />
                </TabsContent>
            </Tabs>
        </>
    );
}
