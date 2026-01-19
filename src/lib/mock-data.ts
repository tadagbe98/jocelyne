import { Project, Resource } from './types';

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Programme d’alphabétisation numérique',
    description: 'Une initiative visant à fournir une formation numérique de base aux artisans locaux pour les aider à commercialiser leurs produits en ligne.',
    goals: 'Former 100 artisans en 6 mois, augmenter leurs ventes de 20%.',
    budget: 5000,
    startDate: '2024-06-01',
    endDate: '2024-12-01',
    status: 'En cours',
    methodology: 'Agile',
    tasks: [
      { id: 't1-1', name: 'Recruter des formateurs', completed: true, dueDate: '2024-06-15' },
      { id: 't1-2', name: 'Développer le contenu du cours', completed: true, dueDate: '2024-07-01' },
      { id: 't1-3', name: 'Lancer la campagne de recrutement des artisans', completed: false, dueDate: '2024-07-15' },
      { id: 't1-4', name: 'Organiser la première session de formation', completed: false, dueDate: '2024-08-01' },
    ],
    expenses: [
        { id: 'e1-1', item: 'Location de salle', amount: 300, date: '2024-06-20' },
        { id: 'e1-2', item: 'Achat d’ordinateurs portables', amount: 2000, date: '2024-06-25' },
        { id: 'e1-3', item: 'Salaires des formateurs (premier mois)', amount: 1000, date: '2024-07-30' },
    ],
  },
  {
    id: 'p2',
    name: 'Coopérative de couture solidaire',
    description: 'Création d’une coopérative pour les femmes couturières afin de mutualiser les ressources, d’accéder à de plus grands marchés et d’améliorer leurs revenus.',
    goals: 'Mettre en place la structure légale, intégrer 20 couturières.',
    budget: 8000,
    startDate: '2024-08-01',
    endDate: '2025-02-01',
    status: 'Pas commencé',
    methodology: 'Hybride',
    tasks: [
        { id: 't2-1', name: 'Étude de faisabilité juridique', completed: false, dueDate: '2024-08-15' },
        { id: 't2-2', name: 'Rencontre avec les couturières intéressées', completed: false, dueDate: '2024-08-30' },
    ],
    expenses: [],
  },
  {
    id: 'p3',
    name: 'Service de livraison à vélo',
    description: 'Développement d’un service de livraison écologique pour les petits commerces du quartier, créant des emplois pour les jeunes.',
    goals: 'Acquérir 10 vélos, embaucher 5 livreurs, signer avec 15 commerces.',
    budget: 12000,
    startDate: '2024-05-01',
    endDate: '2024-11-01',
    status: 'En cours',
    methodology: 'Agile',
    tasks: [
        { id: 't3-1', name: 'Achat des vélos et équipements', completed: true, dueDate: '2024-05-15' },
        { id: 't3-2', name: 'Recrutement des livreurs', completed: true, dueDate: '2024-06-01' },
        { id: 't3-3', name: 'Développement de l\'application de commande', completed: false, dueDate: '2024-08-01' },
        { id: 't3-4', name: 'Partenariats avec les commerces', completed: true, dueDate: '2024-06-15' },
    ],
    expenses: [
        { id: 'e3-1', item: 'Achat de 10 vélos cargo', amount: 6000, date: '2024-05-10' },
        { id: 'e3-2', item: 'Casques et antivols', amount: 500, date: '2024-05-12' },
        { id: 'e3-3', item: 'Salaires (premier mois)', amount: 2500, date: '2024-07-01' },
    ],
  },
  {
    id: 'p4',
    name: 'Recyclage de déchets plastiques',
    description: 'Mise en place d’une unité de collecte et de transformation de déchets plastiques en objets utiles.',
    goals: 'Collecter 1 tonne de plastique par mois.',
    budget: 20000,
    startDate: '2024-02-01',
    endDate: '2024-07-31',
    status: 'Terminé',
    methodology: 'Cascade',
    tasks: [
        { id: 't4-1', name: 'Obtention des autorisations', completed: true, dueDate: '2024-02-28' },
        { id: 't4-2', name: 'Achat du broyeur et de la presse', completed: true, dueDate: '2024-03-15' },
        { id: 't4-3', name: 'Mise en place du réseau de collecte', completed: true, dueDate: '2024-04-01' },
    ],
    expenses: [
        { id: 'e4-1', item: 'Achat de machine', amount: 15000, date: '2024-03-10' },
        { id: 'e4-2', item: 'Frais administratifs', amount: 1200, date: '2024-02-25' },
        { id: 'e4-3', item: 'Location d\'entrepôt (6 mois)', amount: 3000, date: '2024-02-01' },
    ],
  }
];

export const mockResources: Resource[] = [
  {
    id: 'r1',
    title: 'Guide pour rédiger un business plan simple',
    category: 'Guides',
    content: 'Apprenez à structurer vos idées et à planifier la réussite de votre projet en 10 étapes claires. Ce guide couvre la définition de votre mission, l\'analyse de marché, et les prévisions financières.',
    image: 'resource-guide',
  },
  {
    id: 'r2',
    title: '5 conseils pour une gestion de trésorerie efficace',
    category: 'Conseils',
    content: 'La gestion de la trésorerie est vitale. Découvrez des astuces pour suivre vos flux, optimiser vos dépenses et anticiper les besoins futurs afin de garantir la pérennité de votre entreprise.',
    image: 'resource-tips',
  },
  {
    id: 'r3',
    title: 'Mesurer son impact social : les indicateurs clés',
    category: 'Bonnes Pratiques',
    content: 'Aller au-delà du profit. Cette ressource vous aide à identifier et suivre les indicateurs qui démontrent la valeur sociale et environnementale que votre projet apporte à la communauté.',
    image: 'resource-best-practices',
  },
   {
    id: 'r4',
    title: 'Techniques de marketing numérique pour les débutants',
    category: 'Guides',
    content: 'Découvrez comment utiliser les réseaux sociaux, le marketing par courriel et le référencement local pour atteindre plus de clients avec un budget limité.',
    image: 'resource-guide',
  },
  {
    id: 'r5',
    title: 'Comment fixer les prix de vos produits ou services',
    category: 'Conseils',
    content: 'Une stratégie de tarification adéquate est cruciale. Explorez différentes méthodes pour fixer des prix justes qui couvrent vos coûts et sont attractifs pour vos clients.',
    image: 'resource-tips',
  },
];
