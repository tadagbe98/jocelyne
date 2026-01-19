import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockProjects } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectsPage() {
    
    const getStatusVariant = (status: string): "secondary" | "outline" | "default" | "destructive" => {
        switch (status) {
            case 'Terminé': return 'secondary';
            case 'En attente': return 'outline';
            case 'En cours': return 'default';
            default: return 'default';
        }
    }

    const calculateProgress = (tasks: { completed: boolean }[]) => {
        if (tasks.length === 0) return 0;
        const completedTasks = tasks.filter(t => t.completed).length;
        return (completedTasks / tasks.length) * 100;
    };

    return (
        <>
            <PageHeader 
                title="Mes Projets"
                description="Suivez et gérez tous vos projets en un seul endroit."
                actions={
                    <Link href="#" className={buttonVariants()}>
                        <PlusCircle />
                        Nouveau Projet
                    </Link>
                }
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom du projet</TableHead>
                                <TableHead className="hidden md:table-cell">Statut</TableHead>
                                <TableHead className="hidden lg:table-cell">Date de fin</TableHead>
                                <TableHead>Progression</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockProjects.map(project => (
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
                                                <DropdownMenuItem asChild>
                                                   <Link href={`/projects/${project.id}`}>Voir les détails</Link>
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
        </>
    );
}
