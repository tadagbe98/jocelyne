'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Briefcase, CheckCircle, ListTodo, MoreHorizontal, CircleDollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
        description="Chargement de vos indicateurs d'impact..."
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
      collection(firestore, 'companies', userProfile.companyId, 'projects') as any,
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
  const tasksToDo = projects.flatMap(p => p.tasks || []).filter(t => !t.completed).length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const spentBudget = projects.flatMap(p => p.expenses || []).reduce((acc, e) => acc + e.amount, 0);

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
        title={<span className="text-gradient">Tableau de Bord</span>}
        description="Pilotez vos initiatives sociales et économiques avec l'excellence Projexia."
        breadcrumbs={[{ label: "Tableau de Bord" }]}
        actions={
            <Button onClick={() => router.push('/projects/new')} className="premium-shadow mirror-effect bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl transition-all hover:scale-105 active:scale-95">
                <PlusCircle className="mr-2 h-5 w-5" />
                Nouveau Projet
            </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Projets actifs', value: projectsInProgress, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10', trend: '+2 ce mois-ci' },
          { label: 'Tâches', value: tasksToDo, icon: ListTodo, color: 'text-purple-500', bg: 'bg-purple-500/10', trend: 'Actions urgentes' },
          { label: 'Consommation', value: spentBudget.toLocaleString('fr-FR', { style: 'currency', currency: company.currency }), icon: CircleDollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: `sur ${totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: company.currency })}` },
          { label: 'Réussites', value: projects.filter(p => p.status === 'Terminé').length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', trend: 'Impacts validés' }
        ].map((stat, idx) => (
          <motion.div key={idx} variants={item}>
            <Card className="glass-card premium-shadow overflow-hidden border-none group hover:scale-[1.02] transition-transform duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
                    <div className={`p-2.5 ${stat.bg} rounded-xl group-hover:rotate-12 transition-transform`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black tracking-tighter">{stat.value}</div>
                    <p className="text-xs font-medium text-muted-foreground mt-2 flex items-center">
                        {idx === 0 && <TrendingUp className="w-3 h-3 mr-1 text-green-500" />}
                        {stat.trend}
                    </p>
                </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 mt-12 md:grid-cols-5">
        <motion.div variants={item} className="md:col-span-3">
          <Card className="glass-card border-none premium-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Répartition des Projets</CardTitle>
              <Sparkles className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="w-full h-[350px]">
                <ResponsiveContainer>
                  <BarChart data={statusData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                    <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} className="font-bold text-[10px]" />
                    <YAxis tickLine={false} axisLine={false} className="font-bold text-[10px]" />
                    <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.03)' }} content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} barSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="md:col-span-2">
            <Card className="glass-card border-none premium-shadow h-full overflow-hidden">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="text-xl font-bold">Activités Récentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none bg-muted/20">
                                <TableHead className="pl-6 py-4 font-bold uppercase text-[10px] tracking-widest">Nom du Projet</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Statut</TableHead>
                                <TableHead className="text-right pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentActivities.map(project => (
                                <TableRow key={project.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0 group">
                                    <TableCell className="font-bold pl-6 py-5 text-sm">{project.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={project.status === 'Terminé' ? 'secondary' : 'default'} className="rounded-lg px-3 py-1 font-bold text-[10px] shadow-sm">
                                            {project.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => router.push(`/projects/${project.id}`)} 
                                            className="font-bold text-xs hover:bg-primary hover:text-white transition-all rounded-lg"
                                        >
                                            Ouvrir
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

import { PlusCircle } from 'lucide-react';