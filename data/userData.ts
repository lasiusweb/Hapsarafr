import { User } from '../types';
import { AVATARS } from './avatars';

export const MOCK_USERS: User[] = [
  {
    id: 'user-super-admin-1',
    name: 'Hapsara One',
    groupId: 'group-super-admin',
    avatar: AVATARS[10], // Thanos
    tenantId: 'default-tenant',
  },
  {
    id: 'user-admin-1',
    name: 'Admin Tony',
    groupId: 'group-admin',
    avatar: AVATARS[0], // Iron Man
    tenantId: 'default-tenant',
  },
  {
    id: 'user-data-entry-1',
    name: 'Steve Rogers',
    groupId: 'group-data-entry',
    avatar: AVATARS[4], // Captain America
    tenantId: 'default-tenant',
  },
  {
    id: 'user-data-entry-2',
    name: 'Natasha Romanoff',
    groupId: 'group-data-entry',
    avatar: AVATARS[7], // Black Widow
    tenantId: 'default-tenant',
  },
  {
    id: 'user-viewer-1',
    name: 'Dr. Bruce Banner',
    groupId: 'group-viewer',
    avatar: AVATARS[6], // Hulk
    tenantId: 'default-tenant',
  },
];