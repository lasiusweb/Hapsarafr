import { AssistanceScheme } from '../types';

export const ASSISTANCE_SCHEMES: AssistanceScheme[] = [
    {
        id: 'planting-material',
        category: 'Planting Material',
        title: 'Planting Material Support',
        description: 'Assistance for purchasing high-quality indigenous or imported seedlings.',
        assistance: '₹20,000/ha (Indigenous) or ₹29,000/ha (Imported)',
    },
    {
        id: 'gestation-management',
        category: 'Maintenance',
        title: 'Management (Gestation Period)',
        description: 'Support for inter-cropping and maintenance for the first 4 years.',
        assistance: 'Up to ₹50,000/ha over 4 years',
    },
    {
        id: 'drip-irrigation',
        category: 'Infrastructure',
        title: 'Drip Irrigation',
        description: 'Support for installing micro irrigation systems.',
        assistance: 'As per PMKSY operational guidelines',
    },
    {
        id: 'water-harvesting',
        category: 'Infrastructure',
        title: 'Water Harvesting Structure',
        description: 'Assistance for constructing Ponds/tanks.',
        assistance: 'As per MIDH guidelines',
    },
    {
        id: 'bore-well',
        category: 'Infrastructure',
        title: 'Bore/Tube Wells',
        description: 'Support for construction of bore wells, limited to non-critical water zones.',
        assistance: '50% of cost, up to ₹50,000/unit',
    },
    {
        id: 'vermi-compost',
        category: 'Inputs',
        title: 'Vermi Compost Unit',
        description: 'Support for constructing a vermi compost unit (15m x 0.9m x 0.24m).',
        assistance: '50% of cost, up to ₹15,000/unit',
    },
    {
        id: 'harvesting-tools',
        category: 'Tools',
        title: 'Harvesting Tools',
        description: 'Assistance for modern harvesting tools like cutters, motorized chisels, etc.',
        assistance: 'Up to ₹2,500 - ₹50,000 per tool type',
    },
    {
        id: 'replanting',
        category: 'Planting Material',
        title: 'Replanting Old Gardens',
        description: 'Assistance for uprooting and replanting gardens older than 25-30 years.',
        assistance: '50% of cost, up to ₹250/plant',
    },
];