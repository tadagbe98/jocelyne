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
  name:string;
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
  dueDate?: string;
  assigneeId?: string;
  parentId?: string;
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

export type Deliverable = {
  id: string;
  name: string;
  projectId: string;
  companyId: string;
  status: 'À faire' | 'En cours' | 'En revue' | 'Livré' | 'Bloqué';
  type?: string;
  sprintNumber?: number;
  projectPhase?: string;
  acceptanceCriteria?: string;
  validationStatus?: 'En attente' | 'Validé' | 'Rejeté';
  imageUrls?: string[];
  createdAt: Timestamp;
};

export type Timesheet = {
    id: string;
    userId: string;
    projectId: string;
    taskId?: string;
    deliverableId?: string;
    date: string; // yyyy-MM-dd
    duration: number; // in hours
    description: string;
    taskType: 'Développement' | 'Test' | 'Réunion' | 'Documentation' | 'Support / Maintenance';
    status: 'Validé' | 'En attente';
    companyId: string;
    billable?: boolean;
    billingReference?: string;
    createdAt: Timestamp;
};
