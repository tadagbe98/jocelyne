'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { Deliverable, Project, Task, Timesheet } from '@/lib/types';
import { addDoc, collection, query, serverTimestamp, where, orderBy, limit, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MoreHorizontal, X, Timer, Play, Pause, Plus, Link2, Unlink2, ChevronsUpDown, Check, List, LayoutGrid } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const timesheetSchema = z.object({
    date: z.date({ required_error: "La date est requise." }),
    projectId: z.string().min(1, "Le projet est requis."),
    duration: z.number().min(0.01, "La durée doit être supérieure à 0."),
    taskType: z.string().min(1, "Le type de tâche est requis."),
    description: z.string().min(1, "La description est requise."),
    deliverableId: z.string().optional(),
    taskId: z.string().optional(),
    billable: z.boolean().default(false).optional(),
    billingReference: z.string().optional(),
});

const deliverableSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  projectId: z.string().min(1, "Le projet est requis."),
  status: z.string().min(1, "Le statut est requis."),
  type: z.string().optional(),
  sprintNumber: z.coerce.number().optional(),
  projectPhase: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  validationStatus: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

// Helper Components & Functions
const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const parseHours = (formatted: string): number => {
    const [h, m] = formatted.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
};

const getDeliverableStatusColor = (status: Deliverable['status']) => {
    switch (status) {        
        case 'En cours': return 'bg-blue-500';
        case 'Livré': return 'bg-green-500';
        case 'Bloqué': return 'bg-red-500';
        case 'En revue': return 'bg-yellow-500';
        case 'À faire':
        default:
            return 'bg-gray-400';
    }
}


// Main Form Components
function TimesheetForm({ projects, deliverables, onFormSubmit, userProfile, isManager, onNewDeliverable }) {
    const [durationStr, setDurationStr] = useState('00:00');
    const [timer, setTimer] = useState({ running: false, startTime: 0 });

    const form = useForm<z.infer<typeof timesheetSchema>>({
        resolver: zodResolver(timesheetSchema),
        defaultValues: {
            date: new Date(),
            projectId: '',
            duration: 0,
            taskType: '',
            description: '',
            deliverableId: undefined,
            taskId: undefined,
            billable: false,
            billingReference: '',
        },
    });

    const { control, watch, setValue, handleSubmit, reset } = form;
    const selectedProjectId = watch('projectId');
    const selectedProject = useMemo(() => projects?.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
    const projectDeliverables = useMemo(() => deliverables.filter(d => d.projectId === selectedProjectId), [deliverables, selectedProjectId]);
    const selectedDeliverableId = watch('deliverableId');
    const selectedDeliverable = useMemo(() => deliverables.find(d => d.id === selectedDeliverableId), [deliverables, selectedDeliverableId]);
    const billable = watch('billable');
    
    const hierarchicalTasks = useMemo(() => {
        const tasks = selectedProject?.tasks || [];
        if (tasks.length === 0) return [];

        const taskMap = new Map(tasks.map(t => [t.id, { ...t, children: [] as Task[] }]));
        const roots: Task[] = [];

        for (const task of tasks) {
            if (task.parentId && taskMap.has(task.parentId)) {
                const parent = taskMap.get(task.parentId);
                if(parent) {
                    parent.children.push(task);
                }
            } else {
                roots.push(task);
            }
        }

        const flatList: { task: Task, level: number }[] = [];
        function flatten(tasks: Task[], level: number) {
            for (const task of tasks.sort((a, b) => a.name.localeCompare(b.name))) {
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


    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer.running) {
            interval = setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
                const hours = elapsedSeconds / 3600;
                setValue('duration', parseFloat(hours.toFixed(4)));
                setDurationStr(formatHours(hours));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer.running, timer.startTime, setValue]);

    const handleTimerToggle = () => {
        if (timer.running) {
            setTimer({ running: false, startTime: 0 });
        } else {
            const currentDuration = parseHours(durationStr);
            setTimer({ running: true, startTime: Date.now() - (currentDuration * 3600 * 1000) });
        }
    };
    
    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDurationStr(e.target.value);
      setValue('duration', parseHours(e.target.value));
    };

    const processSubmit = (data: z.infer<typeof timesheetSchema>) => {
        onFormSubmit(data);
        reset({
            date: new Date(),
            projectId: '',
            duration: 0,
            taskType: '',
            description: '',
            deliverableId: undefined,
            taskId: undefined,
            billable: false,
            billingReference: '',
        });
        setDurationStr('00:00');
        setTimer({ running: false, startTime: 0 });
    };

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
                    <CardHeader>
                        <CardTitle>Nouvelle entrée de temps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Zone A: Quick Info */}
                        <div className="p-3 space-y-4 border rounded-lg bg-muted/50">
                            <h3 className="text-sm font-medium text-muted-foreground">Infos rapides</h3>
                            <div className="flex flex-wrap items-center gap-4">
                                <FormField control={control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} size="sm" className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>Choisir une date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={control} name="projectId" render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Projet" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Input readOnly value={selectedProject?.methodology || 'Méthode'} className="w-[120px] h-9 bg-muted text-muted-foreground" />
                                <div className="flex items-center gap-1 p-1 border rounded-md bg-background">
                                    <Timer className="w-4 h-4 text-muted-foreground"/>
                                    <Input value={durationStr} onChange={handleDurationChange} className="w-20 h-7 border-none focus-visible:ring-0 p-1 tabular-nums"/>
                                    <Button type="button" size="icon" variant="ghost" className="w-7 h-7" onClick={handleTimerToggle}>
                                        {timer.running ? <Pause className="text-primary"/> : <Play className="text-primary"/>}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Zone B: Work Done */}
                        <div className="space-y-4">
                             <FormField control={control} name="taskId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tâche</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedProjectId ? "Sélectionnez d'abord un projet" : "Lier une tâche (optionnel)..."} /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {hierarchicalTasks.map(({ task, level }) => (
                                                <SelectItem key={task.id} value={task.id} style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                                                   {task.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={control} name="taskType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type de travail</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un type..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Développement">Développement</SelectItem>
                                            <SelectItem value="Test">Test</SelectItem>
                                            <SelectItem value="Réunion">Réunion</SelectItem>
                                            <SelectItem value="Documentation">Documentation</SelectItem>
                                            <SelectItem value="Support / Maintenance">Support / Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description du travail effectué</FormLabel>
                                    <FormControl><Textarea placeholder="Correction du bug sur la page de connexion..." rows={2} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        {/* Zone C: Deliverable */}
                        <div className="space-y-2">
                          <FormLabel>Livrable</FormLabel>
                          {selectedDeliverable ? (
                            <div className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center gap-2">
                                    <span className={cn('w-2.5 h-2.5 rounded-full', getDeliverableStatusColor(selectedDeliverable.status))} />
                                    <span className="font-medium">{selectedDeliverable.name}</span>
                                    <Badge variant="outline">{selectedDeliverable.status}</Badge>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="w-8 h-8" onClick={() => setValue('deliverableId', undefined)}>
                                    <Unlink2 className="w-4 h-4"/>
                                </Button>
                            </div>
                          ) : (
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start font-normal" disabled={!selectedProjectId}>
                                        <Link2 className="mr-2"/>
                                        {selectedProjectId ? "Lier un livrable..." : "Sélectionnez d'abord un projet"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Rechercher un livrable..." />
                                        <CommandList>
                                            <CommandEmpty>Aucun livrable trouvé.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => onNewDeliverable(selectedProjectId)}>
                                                    <Plus className="mr-2"/>
                                                    Créer un nouveau livrable
                                                </CommandItem>
                                                {projectDeliverables.map(d => (
                                                    <CommandItem key={d.id} value={d.name} onSelect={() => setValue('deliverableId', d.id)}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedDeliverableId === d.id ? "opacity-100" : "opacity-0")}/>
                                                        {d.name}
                                                        <Badge variant="outline" className="ml-auto">{d.status}</Badge>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                          )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormField
                                    control={control}
                                    name="billable"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-sm font-normal">
                                                Facturable
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit">Enregistrer le temps</Button>
                            </div>
                             {billable && (
                                <FormField
                                    control={control}
                                    name="billingReference"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Référence de facturation</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ID de facture, bon de commande..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </CardContent>
                </form>
            </Form>
        </Card>
    );
}

function RecentEntriesCard({ entry, getProjectName, getDeliverableName, getTaskName, onDelete }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{getProjectName(entry.projectId)}</p>
            <p className="text-sm text-muted-foreground">{getDeliverableName(entry.deliverableId) || getTaskName(entry.projectId, entry.taskId)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 -mt-2 -mr-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onDelete(entry)} className="text-destructive">
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex justify-between items-end mt-4">
            <div>
                <p className="text-sm text-muted-foreground">{format(new Date(entry.date), 'dd/MM/yy')}</p>
                <Badge variant="outline">{entry.status}</Badge>
            </div>
            <p className="text-lg font-bold">{formatHours(entry.duration)}</p>
        </div>
      </CardContent>
    </Card>
  );
}


// Recent Entries
function RecentEntriesList({ timesheets, projects, deliverables, loading, onDelete }) {
    const [view, setView] = useState<'table' | 'card'>('table');
    
    const getProjectName = useCallback((projectId) => projects.find(p => p.id === projectId)?.name || 'N/A', [projects]);
    const getDeliverableName = useCallback((deliverableId) => deliverables.find(d => d.id === deliverableId)?.name, [deliverables]);
    const getTaskName = useCallback((projectId, taskId) => {
        if (!taskId) return '-';
        const project = projects.find(p => p.id === projectId);
        const task = project?.tasks?.find(t => t.id === taskId);
        return task?.name || 'N/A';
    }, [projects]);

    return (
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mes entrées de temps</CardTitle>
                <div className="flex items-center gap-1 p-1 rounded-md border bg-muted">
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
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-40 w-full" /> : 
                timesheets.length > 0 ? (
                  view === 'table' ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Projet</TableHead>
                                <TableHead>Tâche/Livrable</TableHead>
                                <TableHead>Temps</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead/>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timesheets.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), 'dd/MM/yy')}</TableCell>
                                    <TableCell>{getProjectName(entry.projectId)}</TableCell>
                                    <TableCell>{getDeliverableName(entry.deliverableId) || getTaskName(entry.projectId, entry.taskId)}</TableCell>
                                    <TableCell>{formatHours(entry.duration)}</TableCell>
                                    <TableCell><Badge variant="outline">{entry.status}</Badge></TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => onDelete(entry)} className="text-destructive">Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  ) : (
                    <div className="grid gap-4">
                      {timesheets.map(entry => (
                        <RecentEntriesCard 
                          key={entry.id}
                          entry={entry}
                          getProjectName={getProjectName}
                          getDeliverableName={getDeliverableName}
                          getTaskName={getTaskName}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  )
                ) : (
                    <p className="text-muted-foreground text-center">Aucune entrée pour le moment.</p>
                )}
            </CardContent>
        </Card>
    )
}

function DeliverablePanel({ isOpen, onOpenChange, projects, deliverableToEdit, companyId, onSave }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const isEditing = !!deliverableToEdit;
    const fileInputRef = useRef<HTMLInputElement>(null);


    const form = useForm<z.infer<typeof deliverableSchema>>({
      resolver: zodResolver(deliverableSchema),
    });

    const { control, watch, setValue, handleSubmit, reset } = form;
    const selectedProjectId = watch('projectId');
    const selectedProject = useMemo(() => projects?.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
    const imageUrls = watch('imageUrls', []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const currentUrls = form.getValues('imageUrls') || [];
            const newUrls: string[] = [];
            let filesToProcess = files.length;

            if (currentUrls.length + files.length > 5) {
                toast({ variant: 'destructive', title: "Trop d'images", description: "Vous ne pouvez téléverser que 5 images maximum."});
                return;
            }

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        newUrls.push(event.target.result as string);
                    }
                    filesToProcess--;
                    if (filesToProcess === 0) {
                        setValue('imageUrls', [...currentUrls, ...newUrls]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setValue('imageUrls', (imageUrls || []).filter((_, i) => i !== index));
    };

    
    useEffect(() => {
        if (isOpen) {
            if (deliverableToEdit) {
                reset({
                    ...deliverableToEdit,
                    sprintNumber: deliverableToEdit.sprintNumber || undefined,
                });
            } else {
                reset({
                    name: '',
                    projectId: '',
                    status: 'À faire',
                    type: '',
                    sprintNumber: undefined,
                    projectPhase: '',
                    acceptanceCriteria: '',
                    validationStatus: 'En attente',
                    imageUrls: [],
                });
            }
        }
    }, [isOpen, deliverableToEdit, reset]);

    const processSubmit = async (data: z.infer<typeof deliverableSchema>) => {
        const batch = writeBatch(firestore);
        const ref = isEditing 
            ? doc(firestore, 'companies', companyId, 'deliverables', deliverableToEdit.id)
            : doc(collection(firestore, 'companies', companyId, 'deliverables'));

        batch.set(ref, {
            ...data,
            sprintNumber: data.sprintNumber || null,
            projectPhase: data.projectPhase || null,
            acceptanceCriteria: data.acceptanceCriteria || null,
            validationStatus: data.validationStatus || null,
            type: data.type || null,
            imageUrls: data.imageUrls || [],
            companyId,
            createdAt: isEditing ? deliverableToEdit.createdAt : serverTimestamp(),
        }, { merge: true });

        try {
            await batch.commit();
            toast({ title: `Livrable ${isEditing ? 'mis à jour' : 'créé'} !`});
            onSave();
        } catch (error) {
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'enregistrer le livrable."})
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg">
                <Form {...form}>
                    <form onSubmit={handleSubmit(processSubmit)} className="flex flex-col h-full">
                        <SheetHeader>
                            <SheetTitle>{isEditing ? 'Modifier le' : 'Créer un'} livrable</SheetTitle>
                            <SheetDescription>Renseignez les détails du livrable ici.</SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                            <FormField name="name" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Nom du livrable</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                            )}/>
                            <FormField name="projectId" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Projet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Projet"/></SelectTrigger></FormControl><SelectContent>{projects.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            <FormField name="status" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Statut"/></SelectTrigger></FormControl><SelectContent>{['À faire', 'En cours', 'En revue', 'Livré', 'Bloqué'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>
                            {selectedProject?.methodology === 'Agile' && <FormField name="sprintNumber" control={control} render={({ field }) => (
                                <FormItem><FormLabel>N° Sprint</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                            )}/>}
                             {selectedProject?.methodology === 'Cascade' && <FormField name="projectPhase" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Phase du projet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Phase"/></SelectTrigger></FormControl><SelectContent>{['Analyse des besoins', 'Conception', 'Développement', 'Tests', 'Déploiement', 'Maintenance'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                            )}/>}
                            <div className="space-y-2">
                                <FormLabel>Images</FormLabel>
                                 <Input
                                    ref={fileInputRef}
                                    id="image-upload"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Choisir des fichiers...
                                </Button>
                                {form.formState.errors.imageUrls && <p className="text-sm text-destructive mt-2">{form.formState.errors.imageUrls.message?.toString()}</p>}
                                
                                {imageUrls && imageUrls.length > 0 && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {(imageUrls || []).map((url, index) => (
                                            <div key={index} className="relative group">
                                                <Image src={url} alt={`Preview ${index}`} width={100} height={100} className="rounded-md object-cover w-full aspect-square" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                            <Button type="submit">Enregistrer</Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}

export default function TimesheetPage() {
    const { userProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [deliverableToEdit, setDeliverableToEdit] = useState<Deliverable | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Timesheet | null>(null);

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
    
    const deliverablesQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'deliverables') as collection<Deliverable>
        );
    }, [firestore, userProfile?.companyId]);
    const { data: deliverables, loading: deliverablesLoading } = useCollection<Deliverable>(deliverablesQuery);

    const timesheetQuery = useMemo(() => {
        if (!userProfile?.uid || !userProfile?.companyId) return null;
        return query(
            collection(firestore, 'companies', userProfile.companyId, 'timesheets') as collection<Timesheet>,
            where('userId', '==', userProfile.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }, [userProfile?.uid, userProfile?.companyId]);
    const { data: timesheets, loading: timesheetsLoading, error } = useCollection<Timesheet>(timesheetQuery);
    
    const handleNewDeliverable = (projectId) => {
        setDeliverableToEdit(null);
        setIsPanelOpen(true);
    };

    const handleFormSubmit = async (data) => {
        if (!userProfile?.companyId) return;
        
        const dataToSave = {
            ...data,
            date: format(data.date, 'yyyy-MM-dd'),
            userId: userProfile.uid,
            companyId: userProfile.companyId,
            status: 'En attente' as const,
            createdAt: serverTimestamp(),
        };

        // Clean up undefined optional fields to prevent Firestore errors
        const cleanedData = Object.fromEntries(
            Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
        );

        try {
            await addDoc(collection(firestore, 'companies', userProfile.companyId, 'timesheets'), cleanedData);
            toast({ title: "Feuille de temps enregistrée !" });
        } catch (e) {
            console.error("Firestore error:", e);
            toast({ variant: 'destructive', title: "Erreur", description: (e as Error).message || "Impossible d'enregistrer l'entrée."})
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || !userProfile?.companyId) return;
        try {
            await deleteDoc(doc(firestore, 'companies', userProfile.companyId, 'timesheets', deleteTarget.id));
            toast({ title: "Entrée supprimée" });
            setDeleteTarget(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer l'entrée." });
        }
    };

    return (
    <>
        <PageHeader
            title="Feuille de temps"
            description="Suivez et enregistrez le temps passé sur vos projets."
            breadcrumbs={[{ label: "Feuille de temps" }]}
        />

        <div className="grid gap-8 lg:grid-cols-2">
            <div className="lg:col-span-1">
                <TimesheetForm 
                    projects={projects ?? []}
                    deliverables={deliverables ?? []}
                    onFormSubmit={handleFormSubmit}
                    userProfile={userProfile}
                    isManager={isManager}
                    onNewDeliverable={handleNewDeliverable}
                />
            </div>
            <div className="lg:col-span-1">
                <RecentEntriesList 
                    timesheets={timesheets ?? []}
                    projects={projects ?? []}
                    deliverables={deliverables ?? []}
                    loading={timesheetsLoading || projectsLoading || deliverablesLoading}
                    onDelete={setDeleteTarget}
                />
            </div>
        </div>
        
        <DeliverablePanel 
            isOpen={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            projects={projects ?? []}
            deliverableToEdit={deliverableToEdit}
            companyId={userProfile?.companyId}
            onSave={() => setIsPanelOpen(false)}
        />
        
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                Cette action est irréversible et supprimera définifinement cette entrée de temps.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
