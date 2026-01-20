'use client';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { Company, UserProfile } from "@/lib/types";
import { collection, doc, query, updateDoc, where, DocumentReference } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useDoc } from "@/firebase/firestore/use-doc";
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Briefcase } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createUserForCompany } from "@/firebase/auth/auth";
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";


const companySchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis."),
  creationYear: z.coerce.number().min(1900, "L'année doit être valide."),
  country: z.string().min(1, "Le pays est requis."),
  currency: z.string().min(1, "La devise est requise."),
  language: z.string().min(1, "La langue est requise."),
  logoUrl: z.string().url().optional().nullable(),
});

function CompanyProfileForm() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const companyRef = React.useMemo(() => {
        if (!userProfile?.companyId) return null;
        return doc(firestore, 'companies', userProfile.companyId) as DocumentReference<Company>;
    }, [firestore, userProfile?.companyId]);

    const { data: company, loading: companyLoading } = useDoc<Company>(companyRef);
    
    const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
    });
    
    const currentLogoUrl = watch('logoUrl');

    React.useEffect(() => {
        if (company) {
            reset(company);
        }
    }, [company, reset]);
    
    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue('logoUrl', reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: z.infer<typeof companySchema>) => {
        if (!companyRef) return;
        try {
            await updateDoc(companyRef, data);
            toast({ title: "Succès", description: "Profil de l'entreprise mis à jour." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le profil." });
        }
    };

    if (companyLoading) return <p>Chargement du profil de l'entreprise...</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil de l'entreprise</CardTitle>
                <CardDescription>Mettez à jour les informations de votre entreprise.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-6">
                    <div className="space-y-2">
                        <Label>Logo de l'entreprise</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 rounded-md">
                                <AvatarImage src={currentLogoUrl || undefined} alt="Logo de l'entreprise" />
                                <AvatarFallback className="rounded-md">
                                    <Briefcase className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                             <div className="flex flex-col gap-2">
                                <Label htmlFor="logo-upload" className={buttonVariants({ variant: "outline" })}>
                                    Changer le logo
                                </Label>
                                <Input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} className="hidden" />
                                {currentLogoUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setValue('logoUrl', null)}>Supprimer</Button>}
                            </div>
                        </div>
                        {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl.message}</p>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom de l'entreprise</Label>
                            <Input id="name" {...register("name")} />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="creationYear">Année de création</Label>
                            <Input id="creationYear" type="number" {...register("creationYear")} />
                            {errors.creationYear && <p className="text-sm text-destructive">{errors.creationYear.message}</p>}
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                         <div className="space-y-2">
                            <Label htmlFor="country">Pays</Label>
                            <Input id="country" {...register("country")} />
                            {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="currency">Devise</Label>
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="currency">
                                            <SelectValue placeholder="Sélectionner une devise" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="XOF">Franc CFA (XOF)</SelectItem>
                                            <SelectItem value="EUR">Euro (€)</SelectItem>
                                            <SelectItem value="USD">Dollar Américain ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="language">Langue</Label>
                             <Controller
                                name="language"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="language">
                                            <SelectValue placeholder="Sélectionner une langue" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Français">Français</SelectItem>
                                            <SelectItem value="Anglais">Anglais</SelectItem>
                                            <SelectItem value="Baoulé">Baoulé</SelectItem>
                                            <SelectItem value="Dioula">Dioula</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

const createUserSchema = z.object({
  displayName: z.string().min(2, "Le nom est requis."),
  email: z.string().email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères."),
  confirmPassword: z.string(),
  role: z.enum(['employee', 'scrum-master', 'admin']),
}).refine(data => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});


function UserManagement() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const usersQuery = React.useMemo(() => {
        if (!userProfile?.companyId) return null;
        return query(collection(firestore, 'users'), where('companyId', '==', userProfile.companyId));
    }, [firestore, userProfile?.companyId]);
    
    const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

    const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm({
        resolver: zodResolver(createUserSchema),
        defaultValues: { role: 'employee', displayName: '', email: '', password: '', confirmPassword: '' }
    });

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';

    const handleCreateUser = async (data) => {
        if (!userProfile) return;

        try {
            if (!userProfile.roles?.includes('admin')) {
                throw new Error("Permission refusée.");
            }
            await createUserForCompany(userProfile, data);
            
            toast({
                title: "Utilisateur créé",
                description: `${data.displayName} a été ajouté à votre entreprise.`,
            });
            reset();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error creating user:", error);
            let errorMessage = "Impossible de créer l'utilisateur.";
            if (error instanceof FirebaseError) {
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = "Cette adresse e-mail est déjà utilisée.";
                        break;
                    case 'auth/weak-password':
                        errorMessage = "Le mot de passe doit faire au moins 6 caractères.";
                        break;
                    default:
                        errorMessage = "Erreur: " + error.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast({ variant: 'destructive', title: "Erreur", description: errorMessage });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gestion des utilisateurs</CardTitle>
                        <CardDescription>Ajoutez, visualisez et gérez les membres de votre équipe.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Ajouter un utilisateur</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit(handleCreateUser)}>
                                <DialogHeader>
                                    <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                                    <DialogDescription>
                                        Créez un compte pour un nouveau membre de l'équipe. Il pourra se connecter avec l'email et le mot de passe que vous définissez.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="displayName">Nom complet</Label>
                                        <Input id="displayName" {...register("displayName")} />
                                        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Adresse e-mail</Label>
                                        <Input id="email" type="email" {...register("email")} />
                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Mot de passe</Label>
                                        <Input id="password" type="password" {...register("password")} />
                                        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                                        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                                        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Rôle</Label>
                                        <Controller
                                            name="role"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger id="role">
                                                        <SelectValue placeholder="Sélectionner un rôle" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="employee">Employé</SelectItem>
                                                        <SelectItem value="scrum-master">Scrum Master</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Création en cours..." : "Créer l'utilisateur"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employé</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usersLoading ? (
                            <TableRow><TableCell colSpan={4}>Chargement...</TableCell></TableRow>
                        ) : (users ?? []).map(user => (
                            <TableRow key={user.uid || user.email}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL as string} />
                                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{user.displayName}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{user.roles?.join(', ')}</Badge>
                                </TableCell>
                                <TableCell>
                                     <Badge variant={user.status === 'active' ? 'default' : 'outline'}>{user.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>Modifier le rôle</DropdownMenuItem>
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
    );
}

function SettingsPageLoading() {
    return (
        <>
            <PageHeader
                title="Paramètres"
                description="Gérez les informations de votre entreprise et les utilisateurs."
            />
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}


export default function SettingsPage() {
  const { userProfile, loading: userLoading } = useUser();
  const router = useRouter();
  
  const isAuthorized = userProfile?.roles?.includes('admin');
  
  useEffect(() => {
    // If loading is finished and user is not an admin, redirect them.
    if (!userLoading && !isAuthorized) {
        router.push('/dashboard');
    }
  }, [userLoading, isAuthorized, router]);

  // Show a loading screen while we check for authorization
  if (userLoading || !isAuthorized) {
      return <SettingsPageLoading />;
  }

  // At this point, user is loaded and is an admin.
  const isAdmin = true;

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Gérez les informations de votre entreprise et les utilisateurs."
      />
      
      <Tabs defaultValue="company">
          <TabsList className="mb-6">
              <TabsTrigger value="company">Profil de l'entreprise</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">Utilisateurs</TabsTrigger>}
          </TabsList>
          <TabsContent value="company">
              <CompanyProfileForm />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="users">
                <UserManagement />
            </TabsContent>
          )}
      </Tabs>
    </>
  );
}
