import { User, UserRole } from '../types';

export const USERS: User[] = [
  {
    id: 'user-1',
    name: 'Kushal Reddy',
    role: UserRole.Admin,
    avatar: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/002irm_ons_crd_03.jpg', // Iron Man
  },
  {
    id: 'user-2',
    name: 'Satya MVV',
    role: UserRole.DataEntry,
    avatar: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/009drs_ons_crd_03.jpg', // Doctor Strange
  },
  {
    id: 'user-3',
    name: 'Hussain',
    role: UserRole.DataEntry,
    avatar: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/004tho_ons_crd_03.jpg', // Thor
  },
  {
    id: 'user-4',
    name: 'Ranjith',
    role: UserRole.Viewer,
    avatar: 'https://terrigen-cdn-dev.marvel.com/content/prod/1x/018hcb_ons_crd_02.jpg', // Hawkeye
  },
];