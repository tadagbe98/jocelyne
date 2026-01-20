
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { Project, Timesheet, UserProfile } from '@/lib/types';
import { addDoc, collection, query, serverTimestamp, where, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MoreHorizontal, X } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';


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
  
  deliverableDescription: z.string().optional(),
  deliverableImageUrls: z.array(z.string()).optional(),

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

}).refine(data => {
    if (data.startTime && data.endTime) {
        const [startH, startM] = data.startTime.split(':').map(Number);
        const [endH, endM] = data.endTime.split(':').map(Number);
        return endH > startH || (endH === startH && endM > startM);
    }
    return true;
}, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
});

function MethodologySection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {children}
        </div>
    )
}

function TimesheetForm({ onEntryAdded, projects, projectsLoading, viewedUserId, onUserChange, userProfile }) {
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
        
        deliverableDescription: '',
        deliverableImageUrls: [],

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
  const imageUrls = watch('deliverableImageUrls');


  const startTime = watch('startTime');
  const endTime = watch('endTime');
  
  useEffect(() => {
    setValue('userId', viewedUserId || userProfile?.uid || '');
  }, [viewedUserId, userProfile, setValue]);
  
  useEffect(() => {
    setValue('taskId', '');
  }, [selectedProjectId, setValue]);

  useEffect(() => {
    if (startTime && endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startH, startM);
        const endDate = new Date(0, 0, 0, endH, endM);
        if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const currentUrls = getValues('deliverableImageUrls') || [];

        const promises = files.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to read file as data URL'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then(results => {
            setValue('deliverableImageUrls', [...currentUrls, ...results]);
        }).catch(error => {
            console.error("Error reading files:", error);
            toast({ variant: 'destructive', title: 'Erreur de Fichier', description: "Impossible de lire une ou plusieurs images."})
        })
    }
    // Reset file input to allow re-uploading the same file
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const currentUrls = getValues('deliverableImageUrls') || [];
    const newUrls = currentUrls.filter((_, i) => i !== index);
    setValue('deliverableImageUrls', newUrls);
  };

  const onSubmit = async (data: z.infer<typeof timesheetSchema>) => {
    if (!userProfile?.companyId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Profil non trouvé' });
        return;
    }

    const payload: Partial<Timesheet> = { ...data };
    // Firestore doesn't accept undefined values.
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
        delete payload[key];
      }
    });
    
    try {
        const timesheetsRef = collection(firestore, 'companies', userProfile.companyId, 'timesheets');
        await addDoc(timesheetsRef, {
            ...payload,
            date: format(data.date, 'yyyy-MM-dd'),
            companyId: userProfile.companyId,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Feuille de temps enregistrée !" });
        
        const currentValues = getValues();
        reset({
            ...form.formState.defaultValues,
            userId: currentValues.userId,
            date: currentValues.date,
            projectId: currentValues.projectId,
            deliverableImageUrls: [],
        });

        onEntryAdded(data.userId);
    } catch (error) {
        console.error("Error creating timesheet entry:", error);
        toast({
            variant: 'destructive',
            title: "Erreur",
            description: (error as Error).message || "Impossible d'enregistrer l'entrée.",
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
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">Informations générales</h3>
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

                            <FormField control={control} name="taskId" render={({ field }) => (
                                <FormItem className="md:col-span-2">
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
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">Saisie du temps</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">Description du travail effectué</h3>
                        <FormField control={control} name="notes" render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea placeholder="Décrivez en détail le travail que vous avez accompli..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">Livrables</h3>
                        <div className="space-y-4 pt-4">
                            <FormField control={control} name="deliverableDescription" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description du livrable</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Décrivez le livrable, ex: maquette de la page d'accueil, rapport d'analyse..." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormItem>
                                <FormLabel>Images du livrable</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/gif"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            {imageUrls && imageUrls.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {imageUrls.map((src, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <Image src={src} alt={`Aperçu du livrable ${index + 1}`} fill sizes="150px" className="object-cover rounded-md" />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={() => handleRemoveImage(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {methodology && (
                        <div className="border-t pt-6">
                             <h3 className="text-lg font-semibold tracking-tight text-foreground mb-4">Détails - {methodology}</h3>
                             {methodology === 'Agile' && (
                                <MethodologySection title="">
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
                                    <FormField control={control} name="userStoryId" render={({ field }) => (<FormItem><FormLabel>ID User Story</FormLabel><FormControl><Input placeholder="PROJ-123" {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
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
                                    {watch('isBlocked') && <FormField control={control} name="blockerComment" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Commentaire sur le blocage</FormLabel><FormControl><Textarea placeholder="Décrire le blocage..." {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />}
                                </MethodologySection>
                            )}
                            
                            {methodology === 'Cascade' && (
                                <MethodologySection title="">
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
                                    <FormField control={control} name="wbsCode" render={({ field }) => (<FormItem><FormLabel>Code de la tâche (WBS)</FormLabel><FormControl><Input placeholder="1.2.3" {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
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
                                <MethodologySection title="">
                                     <FormField control={control} name="developmentPhase" render={({ field }) => (
                                        <FormItem><FormLabel>Phase de développement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Spécification">Spécification</SelectItem><SelectItem value="Conception">Conception</SelectItem><SelectItem value="Implémentation">Implémentation</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                     <FormField control={control} name="associatedTestPhase" render={({ field }) => (
                                        <FormItem><FormLabel>Phase de test associée</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Test unitaire">Test unitaire</SelectItem><SelectItem value="Test d’intégration">Test d’intégration</SelectItem><SelectItem value="Test système">Test système</SelectItem><SelectItem value="Test d’acceptation">Test d’acceptation</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                     <FormField control={control} name="testResult" render={({ field }) => (
                                        <FormItem><FormLabel>Résultat du test</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Conforme">Conforme</SelectItem><SelectItem value="Non conforme">Non conforme</SelectItem></SelectContent></Select></FormItem>
                                    )} />
                                    <FormField control={control} name="documentReference" render={({ field }) => (<FormItem><FormLabel>Référence de document</FormLabel><FormControl><Input placeholder="SPEC-V2-REQ-004" {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
                                </MethodologySection>
                            )}

                            {methodology === 'Hybride' && (
                                <MethodologySection title="">
                                    <FormField control={control} name="iterationGoal" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Objectif de l’itération</FormLabel><FormControl><Input placeholder="Finaliser le module de paiement" {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
                                    <FormField control={control} name="kpiTracked" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>KPI suivi</FormLabel><FormControl><Input placeholder="Vélocité de l'équipe" {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
                                </MethodologySection>
                            )}
                        </div>
                    )}
                    
                    <div className="border-t pt-6">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>
                              <h3 className="text-lg font-semibold tracking-tight text-foreground">Options avancées</h3>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                                 <FormField control={control} name="isBillable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Facturable ?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                 <FormField control={control} name="hourlyRate" render={({ field }) => (<FormItem><FormLabel>Taux horaire</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                                 <FormField control={control} name="managerComments" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Commentaires du manager</FormLabel><FormControl><Textarea placeholder="Ajouter un commentaire..." {...field} value={field.value ?? ''}/></FormControl></FormItem>)} />
                               </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                    </div>


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

function RecentEntriesList({ projects, selectedUserId, isManager, userProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [deleteTarget, setDeleteTarget] = useState<Timesheet | null>(null);

    const timesheetQuery = useMemo(() => {
        if (!userProfile?.companyId || !selectedUserId) return null;
        return query(
            collection(firestore, 'companies', userProfile.companyId, 'timesheets') as collection<Timesheet>,
            where('userId', '==', selectedUserId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, [firestore, userProfile?.companyId, selectedUserId]);
    
    const { data: timesheets, loading: timesheetsLoading } = useCollection<Timesheet>(timesheetQuery);

    const getProjectName = useCallback((projectId: string) => {
        return projects?.find(p => p.id === projectId)?.name ?? projectId;
    }, [projects]);

    const getTaskName = useCallback((projectId: string, taskId: string) => {
        if (!projects || !taskId) return 'N/A';
        const project = projects.find(p => p.id === projectId);
        if (!project || !project.tasks) return 'N/A';
        const task = project.tasks.find(t => t.id === taskId);
        return task?.name ?? 'Tâche non trouvée';
    }, [projects]);

    const handleDelete = async () => {
        if (!deleteTarget || !userProfile?.companyId) return;
        try {
            const entryRef = doc(firestore, 'companies', userProfile.companyId, 'timesheets', deleteTarget.id);
            await deleteDoc(entryRef);
            toast({ title: "Entrée supprimée" });
            setDeleteTarget(null); // Close dialog
        } catch (error) {
            console.error("Error deleting entry:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer l'entrée." });
        }
    };
    
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
                                <TableHead>Projet / Tâche</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Durée</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timesheets.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), "dd/MM/yy")}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{getProjectName(entry.projectId)}</div>
                                        <div className="text-sm text-muted-foreground">{getTaskName(entry.projectId, entry.taskId)}</div>
                                         {entry.deliverableDescription && <p className="text-xs text-muted-foreground mt-1 italic">"{entry.deliverableDescription}"</p>}
                                        {entry.deliverableImageUrls && entry.deliverableImageUrls.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {entry.deliverableImageUrls.map((url, index) => (
                                                    <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                                        <Image src={url} alt={`Livrable ${index + 1}`} width={40} height={40} className="rounded-md object-cover"/>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{entry.status}</Badge></TableCell>
                                    <TableCell className="text-right">{entry.duration} h</TableCell>
                                    <TableCell className="text-right">
                                      {(userProfile?.uid === entry.userId || isManager) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem disabled>Modifier</DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onSelect={() => setDeleteTarget(entry)}
                                                >
                                                    Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground">Aucune entrée de temps récente pour cet utilisateur.</p>
                )}
            </CardContent>
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. L'entrée de feuille de temps du <span className="font-bold">{deleteTarget?.date ? format(new Date(deleteTarget.date), "PPP") : ""}</span> d'une durée de <span className="font-bold">{deleteTarget?.duration}h</span> sera définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className={buttonVariants({ variant: "destructive" })}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}

export default function TimesheetPage() {
    const { user, userProfile, loading: userLoading } = useUser();
    const [viewedUserId, setViewedUserId] = useState<string | undefined>();
    
    const isManager = useMemo(() => 
        userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master'),
        [userProfile?.roles]
    );

    useEffect(() => {
      // Set the default viewed user to the current user, once loaded.
      // A manager can then change this via the form.
      // An employee will be locked to their own view.
      if (user && !viewedUserId) {
        setViewedUserId(user.uid);
      }
    }, [user, viewedUserId]);
    
    const projectsQuery = useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(
          collection(firestore, 'companies', userProfile.companyId, 'projects') as collection<Project>
        );
    }, [firestore, userProfile?.companyId]);
    const { data: projects, loading: projectsLoading } = useCollection<Project>(projectsQuery);

    const handleEntryAdded = useCallback((userIdOfNewEntry: string) => {
        setViewedUserId(userIdOfNewEntry);
    }, []);

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
                userProfile={userProfile}
            />
        </div>
        <div className="lg:col-span-1">
            {viewedUserId && <RecentEntriesList projects={projects ?? []} selectedUserId={viewedUserId} isManager={isManager} userProfile={userProfile} />}
        </div>
      </div>
    </>
  );
}
