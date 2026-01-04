// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User, Tenant, Permission } from '../types';
import { useDatabase } from '../DatabaseContext';
import { UserModel, TenantModel, GroupModel } from '../db';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase'; // Assuming getSupabase is used in LoginScreen for initial auth

interface AuthState {
  currentUser: User | null;
  currentTenant: Tenant | null;
  permissions: Set<Permission>;
  users: User[];
  tenants: Tenant[];
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setCurrentTenant: React.Dispatch<React.SetStateAction<Tenant | null>>;
  setPermissions: React.Dispatch<React.SetStateAction<Set<Permission>>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  handleLogout: () => void;
  isLoadingAuth: boolean; // Add a loading state for auth initialization
}

export const useAuth = (): AuthState => {
  const database = useDatabase();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Initialize Auth
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoadingAuth(true);
      try {
        const usersCollection = database.get<UserModel>('users');
        const allUsers = await usersCollection.query().fetch();
        const plainUsers = allUsers.map(u => ({ ...u._raw } as unknown as User));
        setUsers(plainUsers);

        const tenantsCollection = database.get<TenantModel>('tenants');
        const allTenants = await tenantsCollection.query().fetch();
        const plainTenants = allTenants.map(t => ({ ...t._raw } as unknown as Tenant));
        setTenants(plainTenants);

        if (plainUsers.length > 0 && !currentUser) {
          const user = plainUsers[0];
          setCurrentUser(user);
          const tenant = plainTenants.find(t => t.id === user.tenantId) || null;
          setCurrentTenant(tenant);

          try {
            const group = await database.get<GroupModel>('groups').find(user.groupId);
            setPermissions(new Set(JSON.parse(group.permissionsStr || '[]')));
          } catch (e) {
            setPermissions(new Set());
          }
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        // Optionally handle error, e.g., clear currentUser
        setCurrentUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, [database]); // Only re-run if database instance changes

  // Re-evaluate permissions/tenant if currentUser changes (e.g. after login)
  useEffect(() => {
    if (currentUser) {
      const tenant = tenants.find(t => t.id === currentUser.tenantId) || null;
      setCurrentTenant(tenant);

      const fetchPermissions = async () => {
        try {
          const group = await database.get<GroupModel>('groups').find(currentUser.groupId);
          setPermissions(new Set(JSON.parse(group.permissionsStr || '[]')));
        } catch (e) {
          console.error("Failed to fetch permissions for current user:", e);
          setPermissions(new Set());
        }
      };
      fetchPermissions();
    } else {
      setCurrentTenant(null);
      setPermissions(new Set());
    }
  }, [currentUser, database, tenants]);


  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
    setPermissions(new Set());
    // Also clear supabase session if it exists
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.signOut().catch(console.error);
    }
    navigate('/');
  };

  return {
    currentUser,
    currentTenant,
    permissions,
    users,
    tenants,
    setCurrentUser,
    setCurrentTenant,
    setPermissions,
    setUsers,
    setTenants,
    handleLogout,
    isLoadingAuth,
  };
};