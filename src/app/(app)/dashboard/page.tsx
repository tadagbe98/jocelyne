'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Briefcase, CheckCircle, ListTodo, MoreHorizontal, CircleDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import React, { useMemo } from 'react';
import { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

function DashboardLoading() {
  return (
    <>
      <PageHeader
        title="Tableau de Bord"
        description="Bienvenue sur votre espace de gestion de projets à impact."
        breadcrumbs={[{ label: "Tableau de Bord" }]}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-2/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-1/4 mt-1" />
              <Skeleton className="h-3 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 mt-8 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Répartition des projets par statut</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="w-full h-[300px]" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


export default function DashboardPage() {
  const { userProfile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const projectsQuery = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return query(
      collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>,
      orderBy('createdAt', 'desc')
    );
  }, [firestore, userProfile?.companyId]);
  
  const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

  const loading = userLoading || projectsLoading;

  if (loading || !projects) {
    return <DashboardLoading />;
  }

  const projectsInProgress = projects.filter(p => p.status === 'En cours').length;
  const tasksToDo = projects.flatMap(p => p.tasks).filter(t => !t.completed).length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const spentBudget = projects.flatMap(p => p.expenses).reduce((acc, e) => acc + e.amount, 0);

  const statusData = projects.reduce((acc, project) => {
    const status = project.status;
    const existing = acc.find(item => item.status === status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ status, count: 1 });
    }
    return acc;
  }, [] as { status: string; count: number }[]);

  const chartConfig: ChartConfig = {
    count: {
      label: 'Projets',
      color: 'hsl(var(--primary))',
    },
  };

  const recentActivities = projects.slice(0, 3);

  return (
    <>
      <PageHeader
        title="Tableau de Bord"
        description="Bienvenue sur votre espace de gestion de projets à impact."
        breadcrumbs={[{ label: "Tableau de Bord" }]}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Projets en cours</CardTitle>
            <Briefcase className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsInProgress}</div>
            <p className="text-xs text-muted-foreground">Projets actuellement actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tâches à faire</CardTitle>
            <ListTodo className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasksToDo}</div>
            <p className="text-xs text-muted-foreground">Tâches non terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Budget Dépensé</CardTitle>
            <CircleDollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spentBudget.toLocaleString('fr-FR')} €</div>
            <p className="text-xs text-muted-foreground">sur {totalBudget.toLocaleString('fr-FR')} € alloués</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Projets terminés</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'Terminé').length}</div>
            <p className="text-xs text-muted-foreground">Projets achevés avec succès</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Répartition des projets par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full h-[300px]">
              <ResponsiveContainer>
                <BarChart data={statusData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis />
                  <Tooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Projet</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentActivities.map(project => (
                            <TableRow key={project.id}>
                                <TableCell className="font-medium">{project.name}</TableCell>
                                <TableCell>
                                    <Badge variant={project.status === 'Terminé' ? 'secondary' : 'default'}>{project.status}</Badge>
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
                                                Voir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
