
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { Project, Timesheet, UserProfile } from '@/lib/types';
import { addDoc, collection, query, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronsUpDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';


const timesheetSchema = z.object({
  userId: z.string().min(1, "L'employé est requis."),
  projectId: z.string().min(1, "Le projet est requis."),
  taskId: z.string().min(1, "La tâche est requise."),
  date: z.date({ required_error: "La date est requise." }),
  startTime: z.string().min(1, "L'heure de début est requise."),
  endTime: z.string().min(1, "L'heure de fin est requise."),
  duration: z.number().optional(),
  workType: z.string().min(1, "Le type de travail est requis."),
  notes: z.string().optional(),
  status: z.string().min(1, "Le statut est requis."),
  
  // Agile
  agileFramework: z.string().optional(),
  sprintNumber: z.coerce.number().optional(),
  userStoryId: z.string().optional(),
  agileTaskType: z.string().optional(),
  estimatedStoryPoints: z.coerce.number().optional(),
  isBlocked: z.boolean().optional(),
  blockerComment: z.string().optional(),
  
  // Cascade
  projectPhase: z.string().optional(),
  wbsCode: z.string().optional(),
  deliverable: z.string().optional(),
  validationStatus: z.string().optional(),

  // V-Model
  developmentPhase: z.string().optional(),
  associatedTestPhase: z.string().optional(),
  testResult: z.string().optional(),
  documentReference: z.string().optional(),

  // Hybrid
  iterationGoal: z.string().optional(),
  kpiTracked: z.string().optional(),

  // Advanced
  isBillable: z.boolean().optional(),
  hourlyRate: z.coerce.number().optional(),
  managerComments: z.string().optional(),

});

function MethodologySection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">{title}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {children}
            </div>
        </div>
    )
}

function TimesheetForm({ onEntryAdded, projects, projectsLoading, viewedUserId, onUserChange }) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof timesheetSchema>>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
        userId: viewedUserId || '',
        projectId: '',
        taskId: '',
        date: new Date(),
        startTime: '',
        endTime: '',
        duration: 0,
        workType: '',
        notes: '',
        status: 'En cours',
        
        // Agile
        agileFramework: '',
        sprintNumber: undefined,
        userStoryId: '',
        agileTaskType: '',
        estimatedStoryPoints: undefined,
        isBlocked: false,
        blockerComment: '',
        
        // Cascade
        projectPhase: '',
        wbsCode: '',
        deliverable: '',
        validationStatus: '',

        // V-Model
        developmentPhase: '',
        associatedTestPhase: '',
        testResult: '',
        documentReference: '',

        // Hybrid
        iterationGoal: '',
        kpiTracked: '',

        // Advanced
        isBillable: false,
        hourlyRate: undefined,
        managerComments: '',
    },
  });

  const { control, watch, setValue, reset, getValues } = form;

  const selectedProjectId = watch('projectId');
  const selectedProject = useMemo(() => projects?.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const methodology = selectedProject?.methodology;
  const tasksForSelectedProject = useMemo(() => selectedProject?.tasks ?? [], [selectedProject]);

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  
  // Update user ID in form when manager changes selection
  useEffect(() => {
    setValue('userId', viewedUserId || '');
  }, [viewedUserId, setValue]);
  
  // Reset task when project changes
  useEffect(() => {
    setValue('taskId', '');
  }, [selectedProjectId, setValue]);

  // Calculate duration
  useEffect(() => {
    if (startTime && endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startH, startM);
        const endDate = new Date(0, 0, 0, endH, endM);
        if (endDate < startDate) endDate.setDate(endDate.getDate() + 1); // Handle overnight work
        const diff = differenceInMinutes(endDate, startDate);
        setValue('duration', parseFloat((diff / 60).toFixed(2)));
    } else {
        setValue('duration', 0);
    }
  }, [startTime, endTime, setValue]);


  const companyUsersQuery = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return query(
      collection(firestore, 'users') as collection<UserProfile>,
      where('companyId', '==', userProfile.companyId),
      where('status', '==', 'active')
    );
  }, [firestore, userProfile?.companyId]);
  const { data: companyUsers, loading: usersLoading } = useCollection<UserProfile>(companyUsersQuery);

  const isManager = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master');

  const onSubmit = async (data: z.infer<typeof timesheetSchema>) => {
    if (!userProfile?.companyId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Profil non trouvé' });
        return;
    }
    
    try {
        const timesheetsRef = collection(firestore, 'companies', userProfile.companyId, 'timesheets');
        await addDoc(timesheetsRef, {
            ...data,
            date: format(data.date, 'yyyy-MM-dd'),
            companyId: userProfile.companyId,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Feuille de temps enregistrée !" });
        
        const currentValues = getValues();
        reset({
            ...currentValues, // Keep userId, projectId, etc.
            taskId: '',
            startTime: '',
            endTime: '',
            duration: 0,
            notes: '',
            // Reset methodology-specific fields
            agileFramework: '',
            sprintNumber: undefined,
            userStoryId: '',
            agileTaskType: '',
            isBlocked: false,
            blockerComment: '',
            projectPhase: '',
            wbsCode: '',
            deliverable: '',
            validationStatus: '',
            developmentPhase: '',
            associatedTestPhase: '',
            testResult: '',
            documentReference: '',
            iterationGoal: '',
            kpiTracked: '',
        });

        onEntryAdded(data.userId);
    } catch (error) {
        console.error("Error creating timesheet entry:", error);
        toast({
            variant: 'destructive',
            title: "Erreur",
            description: "Impossible d'enregistrer l'entrée.",
        });
    }
  }

  return (
    <Card>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>Nouvelle Entrée</CardTitle>
                    <CardDescription>Renseignez les détails de votre travail.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">Informations générales</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {isManager ? (
                             <FormField control={control} name="userId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employé</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); onUserChange(value); }} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {usersLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                            (companyUsers ?? []).map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ) : (
                            <FormField control={control} name="userId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employé</FormLabel>
                                    <Input readOnly value={userProfile?.displayName || ''} />
                                </FormItem>
                            )} />
                        )}
                        <FormField control={control} name="projectId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Projet</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {projectsLoading ? <SelectItem value="loading" disabled>Chargement...</SelectItem> :
                                        (projects ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.methodology})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={control} name="date" render={({ field }) => (
                           <FormItem className="flex flex-col">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                        )} />
                        
                        <div className="grid grid-cols-3 gap-2">
                             <FormField control={control} name="startTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Début</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={control} name="endTime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fin</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={control} name="duration" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Durée (h)</FormLabel>
                                    <FormControl><Input type="number" readOnly {...field} value={field.value ?? 0} /></FormControl>
                                </FormItem>
                            )} />
                        </div>

                         <FormField control={control} name="taskId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tâche principale</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner une tâche" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {tasksForSelectedProject.length > 0 ?
                                            tasksForSelectedProject.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                            :
                                            <SelectItem value="no-task" disabled>
                                                {selectedProjectId ? "Aucune tâche pour ce projet" : "Sélectionner un projet d'abord"}
                                            </SelectItem>
                                        }
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={control} name="workType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type de travail</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                                    </FormControl>
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
                        )} />

                        <FormField control={control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Statut</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                       <SelectItem value="En cours">En cours</SelectItem>
                                       <SelectItem value="Terminé">Terminé</SelectItem>
                                       <SelectItem value="Bloqué">Bloqué</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                         <FormField control={control} name="notes" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Description de la tâche</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Décrivez le travail effectué..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {/* DYNAMIC METHODOLOGY FIELDS */}
                    {methodology === 'Agile' && (
                        <MethodologySection title="Détails - Agile">
                             <FormField control={control} name="agileFramework" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Framework Agile</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                           <SelectItem value="Scrum">Scrum</SelectItem>
                                           <SelectItem value="Kanban">Kanban</SelectItem>
                                           <SelectItem value="XP">XP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={control} name="sprintNumber" render={({ field }) => (<FormItem><FormLabel>N° de Sprint</FormLabel><FormControl><Input type="number" placeholder="12" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="userStoryId" render={({ field }) => (<FormItem><FormLabel>ID User Story</FormLabel><FormControl><Input placeholder="PROJ-123" {...field} /></FormControl></FormItem>)} />
                             <FormField control={control} name="agileTaskType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type de tâche Agile</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                           <SelectItem value="Feature">Feature</SelectItem>
                                           <SelectItem value="Bug">Bug</SelectItem>
                                           <SelectItem value="Refactoring">Refactoring</SelectItem>
                                           <SelectItem value="Spike">Spike</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={control} name="isBlocked" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Blocage / Impediment</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                            {watch('isBlocked') && <FormField control={control} name="blockerComment" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Commentaire sur le blocage</FormLabel><FormControl><Textarea placeholder="Décrire le blocage..." {...field} /></FormControl></FormItem>)} />}
                        </MethodologySection>
                    )}
                    
                    {methodology === 'Cascade' && (
                        <MethodologySection title="Détails - Cascade">
                             <FormField control={control} name="projectPhase" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phase du projet</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                           <SelectItem value="Analyse des besoins">Analyse des besoins</SelectItem>
                                           <SelectItem value="Conception">Conception</SelectItem>
                                           <SelectItem value="Développement">Développement</SelectItem>
                                           <SelectItem value="Tests">Tests</SelectItem>
                                           <SelectItem value="Déploiement">Déploiement</SelectItem>
                                           <SelectItem value="Maintenance">Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={control} name="wbsCode" render={({ field }) => (<FormItem><FormLabel>Code de la tâche (WBS)</FormLabel><FormControl><Input placeholder="1.2.3" {...field} /></FormControl></FormItem>)} />
                            <FormField control={control} name="deliverable" render={({ field }) => (<FormItem><FormLabel>Livrable associé</FormLabel><FormControl><Input placeholder="Document de specs v1.2" {...field} /></FormControl></FormItem>)} />
                            <FormField control={control} name="validationStatus" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Validation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                           <SelectItem value="En attente">En attente</SelectItem>
                                           <SelectItem value="Validé">Validé</SelectItem>
                                           <SelectItem value="Rejeté">Rejeté</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </MethodologySection>
                    )}

                    {methodology === 'Cycle en V' && (
                        <MethodologySection title="Détails - Cycle en V">
                             <FormField control={control} name="developmentPhase" render={({ field }) => (
                                <FormItem><FormLabel>Phase de développement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Spécification">Spécification</SelectItem><SelectItem value="Conception">Conception</SelectItem><SelectItem value="Implémentation">Implémentation</SelectItem></SelectContent></Select></FormItem>
                            )} />
                             <FormField control={control} name="associatedTestPhase" render={({ field }) => (
                                <FormItem><FormLabel>Phase de test associée</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Test unitaire">Test unitaire</SelectItem><SelectItem value="Test d’intégration">Test d’intégration</SelectItem><SelectItem value="Test système">Test système</SelectItem><SelectItem value="Test d’acceptation">Test d’acceptation</SelectItem></SelectContent></Select></FormItem>
                            )} />
                             <FormField control={control} name="testResult" render={({ field }) => (
                                <FormItem><FormLabel>Résultat du test</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Conforme">Conforme</SelectItem><SelectItem value="Non conforme">Non conforme</SelectItem></SelectContent></Select></FormItem>
                            )} />
                            <FormField control={control} name="documentReference" render={({ field }) => (<FormItem><FormLabel>Référence de document</FormLabel><FormControl><Input placeholder="SPEC-V2-REQ-004" {...field} /></FormControl></FormItem>)} />
                        </MethodologySection>
                    )}

                    {methodology === 'Hybride' && (
                        <MethodologySection title="Détails - Hybride">
                            <FormField control={control} name="iterationGoal" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Objectif de l’itération</FormLabel><FormControl><Input placeholder="Finaliser le module de paiement" {...field} /></FormControl></FormItem>)} />
                            <FormField control={control} name="kpiTracked" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>KPI suivi</FormLabel><FormControl><Input placeholder="Vélocité de l'équipe" {...field} /></FormControl></FormItem>)} />
                        </MethodologySection>
                    )}
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>
                          <h3 className="text-lg font-semibold tracking-tight text-foreground">Options avancées</h3>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                             <FormField control={control} name="isBillable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Facturable ?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                             <FormField control={control} name="hourlyRate" render={({ field }) => (<FormItem><FormLabel>Taux horaire</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                             <FormField control={control} name="managerComments" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Commentaires du manager</FormLabel><FormControl><Textarea placeholder="Ajouter un commentaire..." {...field} /></FormControl></FormItem>)} />
                           </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>


                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting || projectsLoading || usersLoading}>
                        {form.formState.isSubmitting ? "Enregistrement..." : "Enregistrer le temps"}
                    </Button>
                </CardFooter>
            </form>
        </Form>
    </Card>
  )
}

function RecentEntriesList({ projects, selectedUserId }) {
    const { userProfile } = useUser();
    const firestore = useFirestore();

    const timesheetQuery = useMemo(() => {
        if (!userProfile?.companyId || !selectedUserId) return null;
        return query(
            collection(firestore, 'companies', userProfile.companyId, 'timesheets') as collection<Timesheet>,
            where('userId', '==', selectedUserId),
            orderBy('date', 'desc'),
            limit(10)
        );
    }, [firestore, userProfile?.companyId, selectedUserId]);
    const { data: timesheets, loading: timesheetsLoading } = useCollection<Timesheet>(timesheetQuery);

    const getProjectName = (projectId: string) => projects?.find(p => p.id === projectId)?.name ?? projectId;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Entrées Récentes</CardTitle>
            </CardHeader>
            <CardContent>
                 {timesheetsLoading ? <p>Chargement...</p> :
                (timesheets && timesheets.length > 0) ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Projet</TableHead>
                                <TableHead>Type de travail</TableHead>
                                <TableHead className="text-right">Durée (h)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timesheets.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{getProjectName(entry.projectId)}</TableCell>
                                    <TableCell>{entry.workType}</TableCell>
                                    <TableCell className="text-right">{entry.duration}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground">Aucune entrée de temps récente pour cet utilisateur.</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function TimesheetPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();

    // This state will hold the ID of the user whose timesheet is being viewed.
    // For managers, it can be changed. For employees, it's fixed to their own ID.
    const [viewedUserId, setViewedUserId] = useState<string | undefined>();
    
    const isManager = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master');

    useEffect(() => {
        // When the user loads, set the initial viewed user.
        if (user && !viewedUserId) {
            setViewedUserId(user.uid);
        }
        // If a non-manager is somehow viewing another user, reset to themselves.
        if (user && !isManager && viewedUserId !== user.uid) {
            setViewedUserId(user.uid);
        }
    }, [user, isManager, viewedUserId]);


    const projectsQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>
        );
    }, [firestore, userProfile?.companyId]);
    const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

    // This function will be passed to the form to update the list when a new entry is added.
    const handleEntryAdded = useCallback((userIdOfNewEntry: string) => {
        setViewedUserId(userIdOfNewEntry);
    }, []);

    // This function is for managers to switch between employees.
    const handleUserChange = useCallback((newUserId: string) => {
        if (isManager) {
            setViewedUserId(newUserId);
        }
    }, [isManager]);

  return (
    <>
      <PageHeader
        title="Feuille de temps"
        description="Suivez et enregistrez le temps passé sur vos projets."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <TimesheetForm 
                onEntryAdded={handleEntryAdded}
                projects={projects ?? []}
                projectsLoading={projectsLoading}
                viewedUserId={viewedUserId}
                onUserChange={handleUserChange}
            />
        </div>
        <div className="lg:col-span-1">
            {viewedUserId && <RecentEntriesList projects={projects ?? []} selectedUserId={viewedUserId} />}
        </div>
      </div>
    </>
  );
}
