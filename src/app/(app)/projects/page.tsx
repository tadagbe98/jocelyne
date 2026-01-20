'use client';

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { MoreHorizontal, PlusCircle, List, LayoutGrid } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import React, { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from "@/firebase/firestore/use-collection";
import { Project } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

function ProjectsLoading() {
     return (
        <>
            <PageHeader 
                title="Mes Projets"
                description="Suivez et gérez tous vos projets en un seul endroit."
            />
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                           <TableRow>
                                <TableHead>Nom du projet</TableHead>
                                <TableHead className="hidden md:table-cell">Statut</TableHead>
                                <TableHead className="hidden md:table-cell">Méthodologie</TableHead>
                                <TableHead className="hidden lg:table-cell">Date de fin</TableHead>
                                <TableHead>Progression</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}

function ProjectCard({ project, progress, statusVariant }: { project: Project, progress: number, statusVariant: "secondary" | "outline" | "default" | "destructive" }) {
    const router = useRouter();
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <Link href={`/projects/${project.id}`} className="hover:underline text-base font-semibold leading-snug">
                        {project.name}
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 -mr-2 -mt-2">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => router.push(`/projects/${project.id}`)}>
                                Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardTitle>
                <CardDescription>
                     Fin: {new Date(project.endDate).toLocaleDateString('fr-FR')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex justify-between items-center">
                    <Badge variant={statusVariant}>{project.status}</Badge>
                    <Badge variant="outline">{project.methodology}</Badge>
                </div>
                <div>
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progression</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                </div>
            </CardContent>
        </Card>
    );
}


export default function ProjectsPage() {
    const { userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [view, setView] = useState<'table' | 'card'>('table');

    const projectsQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>, 
          orderBy('createdAt', 'desc')
        );
    }, [firestore, userProfile?.companyId]);

    const { data: projects, loading: projectsLoading, error } = useCollection<Project>(projectsQuery);

    const canCreateProject = useMemo(() => 
        userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master'),
        [userProfile?.roles]
    );

    if (userLoading || projectsLoading) {
        return <ProjectsLoading />;
    }
    
    if (error) {
        return <p className="text-destructive">Erreur: {error.message}</p>
    }

    const getStatusVariant = (status: string): "secondary" | "outline" | "default" | "destructive" => {
        switch (status) {
            case 'Terminé': return 'secondary';
            case 'En attente': return 'outline';
            case 'En cours': return 'default';
            default: return 'default';
        }
    }

    const calculateProgress = (tasks: { completed: boolean }[]) => {
        if (!tasks || tasks.length === 0) return 0;
        const completedTasks = tasks.filter(t => t.completed).length;
        return (completedTasks / tasks.length) * 100;
    };

    return (
        <>
            <PageHeader 
                title="Mes Projets"
                description="Suivez et gérez tous vos projets en un seul endroit."
                actions={
                    <div className="flex items-center gap-4">
                        {canCreateProject && (
                            <Link href="/projects/new" className={buttonVariants()}>
                                <PlusCircle className="mr-2" />
                                Nouveau Projet
                            </Link>
                        )}
                         <div className="hidden md:flex items-center gap-1 p-1 rounded-md border bg-muted">
                            <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('table')}>
                                <List className="h-4 w-4" />
                                <span className="sr-only">Vue Tableau</span>
                            </Button>
                            <Button variant={view === 'card' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('card')}>
                                <LayoutGrid className="h-4 w-4" />
                                <span className="sr-only">Vue Cartes</span>
                            </Button>
                        </div>
                    </div>
                }
            />

            {view === 'table' ? (
                 <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom du projet</TableHead>
                                    <TableHead className="hidden md:table-cell">Statut</TableHead>
                                    <TableHead className="hidden md:table-cell">Méthodologie</TableHead>
                                    <TableHead className="hidden lg:table-cell">Date de fin</TableHead>
                                    <TableHead>Progression</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map(project => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/projects/${project.id}`} className="hover:underline">
                                                {project.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant={getStatusVariant(project.status)}>
                                                {project.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant="outline">{project.methodology}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            {new Date(project.endDate).toLocaleDateString('fr-FR')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={calculateProgress(project.tasks)} className="w-full md:w-32" />
                                                <span className="text-sm text-muted-foreground hidden md:inline">{Math.round(calculateProgress(project.tasks))}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => router.push(`/projects/${project.id}`)}>
                                                       Voir les détails
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map(project => {
                        const progress = calculateProgress(project.tasks);
                        const statusVariant = getStatusVariant(project.status);
                        return <ProjectCard key={project.id} project={project} progress={progress} statusVariant={statusVariant} />;
                    })}
                </div>
            )}
        </>
    );
}
