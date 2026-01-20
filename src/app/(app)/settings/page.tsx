'use client';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/lib/types";
import { collection, doc, query, updateDoc, where, addDoc } from "firebase/firestore";
import { useCollection, useDoc } from "@/firebase/firestore";
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const companySchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis."),
  creationYear: z.coerce.number().min(1900, "L'année doit être valide."),
  country: z.string().min(1, "Le pays est requis."),
  currency: z.string().min(1, "La devise est requise."),
  language: z.string().min(1, "La langue est requise."),
});

function CompanyProfileForm() {
    const { userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const companyRef = React.useMemo(() => {
        if (!userProfile?.companyId) return null;
        return doc(firestore, 'companies', userProfile.companyId);
    }, [firestore, userProfile?.companyId]);

    const { data: company, loading: companyLoading } = useDoc(companyRef);
    
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
        resolver: zodResolver(companySchema),
        values: company, // Load initial values from Firestore
    });

    React.useEffect(() => {
        if (company) {
            reset(company);
        }
    }, [company, reset]);

    const onSubmit = async (data) => {
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
                <CardContent className="grid gap-4">
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
                            <Input id="currency" {...register("currency")} />
                            {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="language">Langue</Label>
                            <Input id="language" {...register("language")} />
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

const inviteSchema = z.object({
  displayName: z.string().min(2, "Le nom est requis."),
  email: z.string().email("L'adresse e-mail n'est pas valide."),
  role: z.enum(['employee', 'scrum-master', 'admin']),
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

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
        resolver: zodResolver(inviteSchema),
        defaultValues: { role: 'employee' }
    });

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '';

    const handleInviteUser = async (data) => {
        if (!userProfile?.companyId) return;

        try {
            // Note: This only creates a user profile in Firestore.
            // A secure implementation requires a backend function (e.g., Firebase Function)
            // to create the actual Firebase Auth user.
            const usersRef = collection(firestore, 'users');
            await addDoc(usersRef, {
                displayName: data.displayName,
                email: data.email,
                roles: [data.role],
                companyId: userProfile.companyId,
                status: 'pending', // User must sign up to activate the account
                photoURL: null,
                uid: '' // UID will be set upon user's first sign-in
            });
            
            toast({
                title: "Invitation envoyée (simulation)",
                description: `${data.displayName} a été ajouté. Il doit s'inscrire avec l'adresse ${data.email} pour activer son compte.`,
            });
            reset();
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error inviting user:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'inviter l'utilisateur." });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gestion des utilisateurs</CardTitle>
                        <CardDescription>Invitez, visualisez et gérez les membres de votre équipe.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Inviter un utilisateur</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit(handleInviteUser)}>
                                <DialogHeader>
                                    <DialogTitle>Inviter un nouveau membre</DialogTitle>
                                    <DialogDescription>
                                        Cette personne sera ajoutée à votre entreprise. Elle devra s'inscrire avec cette adresse e-mail pour accéder à l'application.
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
                                        <Label htmlFor="role">Rôle</Label>
                                        <Select onValueChange={(value) => reset({ ...register, role: value })} defaultValue="employee">
                                            <SelectTrigger id="role">
                                                <SelectValue placeholder="Sélectionner un rôle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="employee">Employé</SelectItem>
                                                <SelectItem value="scrum-master">Scrum Master</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Envoi en cours..." : "Envoyer l'invitation"}
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
                            <TableRow key={user.uid}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL} />
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

export default function SettingsPage() {
  const { userProfile } = useUser();
  const isAdminOrScrumMaster = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('scrum-master');

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Gérez les informations de votre entreprise et les utilisateurs."
      />
      
      <Tabs defaultValue="company">
          <TabsList className="mb-6">
              <TabsTrigger value="company">Profil de l'entreprise</TabsTrigger>
              {isAdminOrScrumMaster && <TabsTrigger value="users">Utilisateurs</TabsTrigger>}
          </TabsList>
          <TabsContent value="company">
              <CompanyProfileForm />
          </TabsContent>
          {isAdminOrScrumMaster && (
            <TabsContent value="users">
                <UserManagement />
            </TabsContent>
          )}
      </Tabs>
    </>
  );
}
