export type Project = {
  id: string;
  name: string;
  description: string;
  goals: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: 'Pas commencé' | 'En cours' | 'Terminé' | 'En attente';
  tasks: Task[];
  expenses: Expense[];
};

export type Task = {
  id: string;
  name: string;
  completed: boolean;
  dueDate: string;
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
