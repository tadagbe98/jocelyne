'use client'

import { notFound } from 'next/navigation';
import { mockProjects } from '@/lib/mock-data';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Check, CircleDollarSign, ListChecks, Plus, Trash2, Workflow } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState } from 'react';
import { Expense, Task } from '@/lib/types';
import { Input } from '@/components/ui/input';

const getProject = (id: string) => mockProjects.find(p => p.id === id);

// Client component for the project plan (to-do list)
function ProjectPlan({ initialTasks }: { initialTasks: Task[] }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [newTask, setNewTask] = useState('');

    const handleAddTask = () => {
        if (newTask.trim() === '') return;
        const newId = `t${Date.now()}`;
        setTasks([...tasks, { id: newId, name: newTask, completed: false, dueDate: new Date().toISOString().split('T')[0] }]);
        setNewTask('');
    };

    const toggleTask = (taskId: string) => {
        setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
    };
    
    const removeTask = (taskId: string) => {
        setTasks(tasks.filter(task => task.id !== taskId));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plan de projet (To-do list)</CardTitle>
                <CardDescription>Organisez les activités de votre projet.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Ajouter une nouvelle tâche..." />
                    <Button onClick={handleAddTask}><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
                </div>
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center p-2 rounded-md hover:bg-muted/50">
                            <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="mr-4" />
                            <label htmlFor={`task-${task.id}`} className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.name}
                            </label>
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeTask(task.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Client component for budget management
function ProjectBudget({ initialBudget, initialExpenses }: { initialBudget: number, initialExpenses: Expense[] }) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = initialBudget - spent;
    const progress = (spent / initialBudget) * 100;

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
                            <span>Total: {initialBudget.toLocaleString('fr-FR')} €</span>
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
                            {expenses.map(expense => (
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


export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
    const project = getProject(params.id);

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
                                           <p className="text-sm text-muted-foreground">{project.budget.toLocaleString('fr-FR')} €</p>
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
                    <ProjectPlan initialTasks={project.tasks} />
                </TabsContent>

                <TabsContent value="budget">
                    <ProjectBudget initialBudget={project.budget} initialExpenses={project.expenses} />
                </TabsContent>
            </Tabs>
        </>
    );
}
