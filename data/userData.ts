// FIX: Import from the newly created types.ts file
import { User } from '../types';
import { AVATARS } from './avatars';

export const MOCK_USERS: User[] = [
  {
    id: 'user-super-admin-1',
    name: 'Hapsara One',
    email: 'superadmin@hapsara.com',
    groupId: 'group-super-admin',
    avatar: AVATARS[10], // Thanos
    tenantId: 'default-tenant',
    is_verified: true,
  },
  {
    id: 'user-admin-1',
    name: 'Admin Tony',
    email: 'admin@hapsara.com',
    groupId: 'group-admin',
    avatar: AVATARS[0], // Iron Man
    tenantId: 'default-tenant',
    is_verified: true,
  },
  {
    id: 'user-data-entry-1',
    name: 'Steve Rogers',
    email: 'steve@hapsara.com',
    groupId: 'group-data-entry',
    avatar: AVATARS[4], // Captain America
    tenantId: 'default-tenant',
    is_verified: true,
  },
  {
    id: 'user-data-entry-2',
    name: 'Natasha Romanoff',
    email: 'natasha@hapsara.com',
    groupId: 'group-data-entry',
    avatar: AVATARS[7], // Black Widow
    tenantId: 'default-tenant',
    is_verified: true,
  },
  {
    id: 'user-viewer-1',
    name: 'Dr. Bruce Banner',
    email: 'bruce@hapsara.com',
    groupId: 'group-viewer',
    avatar: AVATARS[6], // Hulk
    tenantId: 'default-tenant',
    is_verified: true,
  },
];