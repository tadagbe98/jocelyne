
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Briefcase, CheckCircle, ListTodo, MoreHorizontal, CircleDollarSign, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, DocumentReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import React, { useMemo } from 'react';
import { Company, Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Tableau de Bord"
        description="Bienvenue sur votre espace de gestion de projets à impact."
        breadcrumbs={[{ label: "Tableau de Bord" }]}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 mt-8 md:grid-cols-5">
        <Skeleton className="md:col-span-3 h-[400px] rounded-2xl" />
        <Skeleton className="md:col-span-2 h-[400px] rounded-2xl" />
      </div>
    </div>
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

  const companyRef = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return doc(firestore, 'companies', userProfile.companyId) as DocumentReference<Company>;
  }, [firestore, userProfile?.companyId]);
  const { data: company, loading: companyLoading } = useDoc<Company>(companyRef);

  const loading = userLoading || projectsLoading || companyLoading;

  if (loading || !projects || !company) {
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

  const recentActivities = projects.slice(0, 5);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <PageHeader
        title="Tableau de Bord"
        description="Pilotez vos initiatives sociales et économiques avec précision."
        breadcrumbs={[{ label: "Tableau de Bord" }]}
        actions={
            <Button onClick={() => router.push('/projects/new')} className="premium-shadow mirror-effect">
                Lancer un Projet
            </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
            <Card className="glass-card premium-shadow overflow-hidden border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Projets actifs</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{projectsInProgress}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> +2 ce mois-ci
                    </p>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={item}>
            <Card className="glass-card premium-shadow overflow-hidden border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tâches</CardTitle>
                    <div className="p-2 bg-purple-500/10 rounded-full">
                        <ListTodo className="w-4 h-4 text-purple-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{tasksToDo}</div>
                    <p className="text-xs text-muted-foreground mt-1">Actions à mener rapidement</p>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={item}>
            <Card className="glass-card premium-shadow overflow-hidden border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consommation</CardTitle>
                    <div className="p-2 bg-indigo-500/10 rounded-full">
                        <CircleDollarSign className="w-4 h-4 text-indigo-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{spentBudget.toLocaleString('fr-FR', { style: 'currency', currency: company.currency })}</div>
                    <p className="text-xs text-muted-foreground mt-1">sur {totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: company.currency })}</p>
                </CardContent>
            </Card>
        </motion.div>

        <motion.div variants={item}>
            <Card className="glass-card premium-shadow overflow-hidden border-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Réussites</CardTitle>
                    <div className="p-2 bg-green-500/10 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{projects.filter(p => p.status === 'Terminé').length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Impacts réalisés avec succès</p>
                </CardContent>
            </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 mt-12 md:grid-cols-5">
        <motion.div variants={item} className="md:col-span-3">
          <Card className="glass-card border-none premium-shadow h-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="w-full h-[350px]">
                <ResponsiveContainer>
                  <BarChart data={statusData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="md:col-span-2">
            <Card className="glass-card border-none premium-shadow h-full">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-gradient">Dernières Activités</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none bg-muted/30">
                                <TableHead className="pl-6 py-4 font-semibold">Projet</TableHead>
                                <TableHead className="font-semibold">Statut</TableHead>
                                <TableHead className="text-right pr-6 font-semibold"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentActivities.map(project => (
                                <TableRow key={project.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5">
                                    <TableCell className="font-semibold pl-6 py-5">{project.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={project.status === 'Terminé' ? 'secondary' : 'default'} className="rounded-md font-medium">
                                            {project.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${project.id}`)} className="hover:bg-primary hover:text-white">
                                            Gérer
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
