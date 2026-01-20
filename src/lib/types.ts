import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  companyId?: string;
  roles?: ('admin' | 'employee' | 'scrum-master')[];
  status?: 'active' | 'pending';
}

export type Company = {
  id: string;
  name: string;
  ownerId: string;
  creationYear: number;
  country: string;
  currency: string;
  language: string;
  createdAt: Timestamp;
  logoUrl?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  goals: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: 'Pas commencé' | 'En cours' | 'Terminé' | 'En attente';
  methodology: 'Agile' | 'Cascade' | 'Cycle en V' | 'Hybride';
  tasks: Task[];
  expenses: Expense[];
  companyId: string;
  createdAt: Timestamp;
};

export type Task = {
  id: string;
  name: string;
  completed: boolean;
  dueDate: string;
  assigneeId?: string;
};

export type Expense = {
  id: string;
  item: string;
  amount: number;
  date: string;
};

export type Resource = {
  id: string;
  title: string;
  category: 'Guides' | 'Conseils' | 'Bonnes Pratiques';
  content: string;
  image: string;
};

export type Timesheet = {
    id: string;
    userId: string;
    projectId: string;
    taskId: string;
    date: string; // yyyy-MM-dd
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    duration: number; // in hours
    notes?: string;
    companyId: string;
    createdAt: Timestamp;
    deliverableDescription?: string;
    deliverableImageUrls?: string[];

    workType?: 'Développement' | 'Test' | 'Réunion' | 'Documentation' | 'Support / Maintenance';
    status?: 'En cours' | 'Terminé' | 'Bloqué';

    // Agile
    agileFramework?: 'Scrum' | 'Kanban' | 'XP';
    sprintNumber?: number;
    userStoryId?: string;
    agileTaskType?: 'Feature' | 'Bug' | 'Refactoring' | 'Spike';
    estimatedStoryPoints?: number;
    isBlocked?: boolean;
    blockerComment?: string;
    agileToolLink?: string;

    // Cascade
    projectPhase?: 'Analyse des besoins' | 'Conception' | 'Développement' | 'Tests' | 'Déploiement' | 'Maintenance';
    wbsCode?: string;
    validationStatus?: 'En attente' | 'Validé' | 'Rejeté';

    // V-Model
    developmentPhase?: 'Spécification' | 'Conception' | 'Implémentation';
    associatedTestPhase?: 'Test unitaire' | 'Test d’intégration' | 'Test système' | 'Test d’acceptation';
    testResult?: 'Conforme' | 'Non conforme';
    documentReference?: string;

    // Hybrid
    iterationGoal?: string;
    kpiTracked?: string;

    // Advanced
    isBillable?: boolean;
    hourlyRate?: number;
    calculatedCost?: number;
    approvalStatus?: string;
    managerComments?: string;
};
