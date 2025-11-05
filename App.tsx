import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, User, Group, Permission, Invitation } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query } from '@nozbe/watermelondb';
import { FarmerModel } from './db';
import DataMenu from './components/DataMenu';
import { initializeSupabase } from './lib/supabase';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PrintView = lazy(() => import('./components/PrintView'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const BatchUpdateStatusModal = lazy(() => import('./components/BatchUpdateStatusModal'));
const SyncConfirmationModal = lazy(() => import('./components/SyncConfirmationModal'));
const BulkImportModal = lazy(() => import('./components/BulkImportModal'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ConfirmationModal = lazy(() => import('./components/ConfirmationModal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const SupabaseSettingsModal = lazy(() => import('./components/SupabaseSettingsModal'));

// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

const ModalLoader: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
    </div>
);

// Custom hook to track online status
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};

// Custom hooks to observe WatermelonDB queries
const useQuery = <T extends FarmerModel>(query: Query<T>): T[] => {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const subscription = query.observe().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [query]);
  return data;
};

const Header: React.FC<{
  currentUser: User | null;
  onLogout: () => void;
  onProfileClick: () => void;
  onAdminClick: () => void;
  onRegister: () => void;
  onExport: () => void;
  onExportCsv: () => void;
  onImport: () => void;
  onDeleteSelected: () => void;
  onBatchUpdate: () => void;
  syncLoading: boolean;
  selectedCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
  permissions: Set<Permission>;
}> = ({ currentUser, onLogout, onProfileClick, onAdminClick, onRegister, onExport, onExportCsv, onImport, onDeleteSelected, onBatchUpdate, syncLoading, selectedCount, isOnline, pendingSyncCount, permissions }) => {
  const canRegister = permissions.has(Permission.CAN_REGISTER_FARMER);
  const canDelete = permissions.has(Permission.CAN_DELETE_FARMER);
  const canEdit = permissions.has(Permission.CAN_EDIT_FARMER);
  const canManage = permissions.has(Permission.CAN_MANAGE_GROUPS) || permissions.has(Permission.CAN_MANAGE_USERS);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 00-1.09.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
          <h1 className="text-2xl font-bold text-gray-800">Hapsara Farmer Registration</h1>
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-colors`} title={isOnline ? 'Online' : 'Offline - Changes are saved locally'}></span>
              <span className="text-sm font-medium text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
              {(pendingSyncCount > 0 || syncLoading) && (<span className={`text-sm font-semibold ${syncLoading ? 'text-blue-600 animate-pulse' : 'text-yellow-600'}`}>{syncLoading ? 'Syncing...' : `(${pendingSyncCount} pending)`}</span>)}
          </div>
      </div>
      <div className="flex items-center gap-4">
        {currentUser && (
          <button onClick={onProfileClick} className="text-right border-r pr-4 hover:bg-gray-100 rounded-md p-2 transition">
            <p className="font-semibold text-gray-800">{currentUser.name}</p>
            <p className="text-xs text-gray-500">View Profile</p>
          </button>
        )}
        <div className="flex gap-2">
          {canDelete && selectedCount > 0 && (<button onClick={onDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold flex items-center gap-2" title={`Delete ${selectedCount} selected farmer(s)`}>Delete Selected ({selectedCount})</button>)}
          {canEdit && selectedCount > 0 && (<button onClick={onBatchUpdate} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold flex items-center gap-2" title={`Update status for ${selectedCount} selected farmer(s)`}>Update Status ({selectedCount})</button>)}
          <DataMenu onImport={onImport} onExportExcel={onExport} onExportCsv={onExportCsv} permissions={permissions} />
          {canRegister && (<button onClick={onRegister} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Register Farmer</button>)}
          {canManage && (<button onClick={onAdminClick} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition font-semibold">Admin Panel</button>)}
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Logout</button>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [supabase, setSupabase] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showSupabaseSettings, setShowSupabaseSettings] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'accept-invitation'>('login');
  
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [printingFarmer, setPrintingFarmer] = useState<FarmerModel | null>(null);
  const [pdfExportFarmer, setPdfExportFarmer] = useState<FarmerModel | null>(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const isOnline = useOnlineStatus();
  const [filters, setFilters] = useState<Filters>({ searchQuery: '', district: '', mandal: '', village: '', status: '', registrationDateFrom: '', registrationDateTo: '' });
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id', direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

  const database = useDatabase();
  const farmersCollection = database.get<FarmerModel>('farmers');
  
  const allFarmers = useQuery(farmersCollection.query(Q.where('syncStatus', Q.notEq('pending_delete'))));
  const pendingSyncCount = useQuery(farmersCollection.query(Q.where('syncStatus', Q.oneOf(['pending', 'pending_delete'])))).length;
  
  const currentUserPermissions = useMemo(() => {
    if (!currentUser) return new Set<Permission>();
    const userGroup = groups.find(g => g.id === currentUser.groupId);
    return new Set(userGroup?.permissions || []);
  }, [currentUser, groups]);

  // --- SUPABASE & AUTH ---
  useEffect(() => {
    const client = initializeSupabase();
    if (client) {
      setSupabase(client);
    } else {
      setShowSupabaseSettings(true);
    }
  }, []);
  
  const handlePullSync = useCallback(async (isInitialSync = false) => {
      if (!supabase || !isOnline) {
          if (!isInitialSync) setNotification({ message: `Cannot sync while offline.`, type: 'error'});
          return;
      }
      if (!isInitialSync) setNotification({ message: 'Fetching latest data from server...', type: 'success' });
      try {
          const { data, error } = await supabase.from('farmers').select('*');
          if (error) throw error;

          if (data && data.length > 0) {
              await database.write(async () => {
                  const existingFarmers = await farmersCollection.query().fetch();
                  const recordsToUpdate: FarmerModel[] = [];
                  const recordsToCreate: any[] = [];

                  for (const remoteFarmer of data) {
                      const localFarmer = existingFarmers.find(f => f.id === remoteFarmer.id);
                      if (localFarmer) {
                          // Only update if remote is newer or local is synced (to avoid overwriting pending changes)
                          if (localFarmer.syncStatus === 'synced') {
                             recordsToUpdate.push(
                                localFarmer.prepareUpdate(record => {
                                    Object.assign(record, { ...remoteFarmer, syncStatus: 'synced' });
                                })
                            );
                          }
                      } else {
                          recordsToCreate.push(
                              farmersCollection.prepareCreate(record => {
                                  Object.assign(record, { ...remoteFarmer, syncStatus: 'synced' });
                                  record._raw.id = remoteFarmer.id;
                              })
                          );
                      }
                  }
                  
                  const allOperations = [...recordsToCreate, ...recordsToUpdate];
                  if (allOperations.length > 0) {
                      await database.batch(...allOperations);
                  }
              });
              if (!isInitialSync) setNotification({ message: `Successfully synced ${data.length} records from the server.`, type: 'success' });
          } else {
               if (!isInitialSync) setNotification({ message: 'No new data found on the server.', type: 'success' });
          }
      } catch (error: any) {
          if (!isInitialSync) setNotification({ message: `Failed to fetch data: ${error.message}`, type: 'error' });
      }
  }, [supabase, isOnline, database, farmersCollection]);

  // --- Real-time and Background Sync ---
  useEffect(() => {
    if (!supabase || !session) return;
    
    // 1. Background PUSH sync for pending changes
    const syncInterval = setInterval(async () => {
        if (!isOnline) return;

        setSyncLoading(true);
        try {
            // Sync pending creations/updates
            const pendingFarmers = await farmersCollection.query(Q.where('syncStatus', 'pending')).fetch();
            if (pendingFarmers.length > 0) {
                const plainFarmers = pendingFarmers.map(f => ({ ...f._raw, id: f.id }));
                const { error } = await supabase.from('farmers').upsert(plainFarmers);
                if (error) throw error;
                await database.write(async () => {
                    const updates = pendingFarmers.map(f => f.prepareUpdate(rec => { rec.syncStatus = 'synced'; }));
                    await database.batch(...updates);
                });
            }

            // Sync pending deletions
            const pendingDeleteFarmers = await farmersCollection.query(Q.where('syncStatus', 'pending_delete')).fetch();
            if (pendingDeleteFarmers.length > 0) {
                const idsToDelete = pendingDeleteFarmers.map(f => f.id);
                const { error } = await supabase.from('farmers').delete().in('id', idsToDelete);
                if (error) throw error;
                await database.write(async () => {
                    const deletions = pendingDeleteFarmers.map(f => f.prepareDestroyPermanently());
                    await database.batch(...deletions);
                });
            }
        } catch (error) {
            console.error('Background sync failed:', error);
        } finally {
            setSyncLoading(false);
        }
    }, 30000); // Sync every 30 seconds

    // 2. Real-time PULL subscription for changes from other clients
    const channel = supabase.channel('public:farmers');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farmers' }, async (payload: any) => {
        await database.write(async () => {
            const collection = database.get<FarmerModel>('farmers');
            let farmer;
            switch (payload.eventType) {
                case 'INSERT':
                case 'UPDATE':
                    const existing = await collection.query(Q.where('id', payload.new.id)).fetch();
                    if (existing.length > 0) {
                        farmer = existing[0];
                        // Avoid overwriting local pending changes
                        if (farmer.syncStatus === 'synced') {
                           await farmer.update(rec => Object.assign(rec, { ...payload.new, syncStatus: 'synced' }));
                        }
                    } else {
                       await collection.create(rec => {
                           Object.assign(rec, { ...payload.new, syncStatus: 'synced' });
                           rec._raw.id = payload.new.id;
                       });
                    }
                    break;
                case 'DELETE':
                    farmer = await collection.find(payload.old.id);
                    await farmer.destroyPermanently();
                    break;
            }
        });
      })
      .subscribe();
      
    return () => {
        clearInterval(syncInterval);
        supabase.removeChannel(channel);
    };

  }, [supabase, session, isOnline, database, farmersCollection]);
  
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('invitation')) {
          setAuthView('accept-invitation');
          window.history.replaceState({}, document.title, window.location.pathname);
      }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Error fetching user profile:', error);
    } else if (data) {
      setCurrentUser({ id: data.id, name: data.full_name, avatar: data.avatar_url, groupId: data.group_id });
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const fetchPublicData = async () => {
        const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*');
        if (groupsError) console.error('Error fetching groups:', groupsError); else setGroups(groupsData || []);
        
        const { data: invData, error: invError } = await supabase.from('invitations').select('*');
        if (invError) console.error('Error fetching invitations:', invError); else setInvitations(invData || []);
    };
    fetchPublicData();
  }, [supabase]);
  
  useEffect(() => {
    if (!supabase) return;
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        handlePullSync(true); // Initial data pull on session load
      }
    };
    getInitialSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        handlePullSync(true); // Initial data pull on login
      }
      else setCurrentUser(null);
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase, fetchUserProfile, handlePullSync]);

  useEffect(() => {
    if (session && supabase && currentUserPermissions.has(Permission.CAN_MANAGE_USERS)) {
        const fetchAdminData = async () => {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) console.error('Error fetching users:', error);
            else setUsers(data.map((d: any) => ({ id: d.id, name: d.full_name, avatar: d.avatar_url, groupId: d.group_id })) || []);
        };
        fetchAdminData();
    }
  }, [session, supabase, currentUserPermissions]);

  const handleSaveSupabaseSettings = (url: string, key: string) => {
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseAnonKey', key);
    window.location.reload();
  };
  
  const handleLogout = async () => {
      if (supabase) await supabase.auth.signOut();
      setCurrentUser(null);
      setView('dashboard');
  };

  const handleSaveProfile = async (updatedUser: User) => {
      if (!supabase || !currentUser) return;
      const { error } = await supabase
          .from('profiles')
          .update({ full_name: updatedUser.name, avatar_url: updatedUser.avatar })
          .eq('id', currentUser.id);

      if (error) {
          setNotification({ message: `Error updating profile: ${error.message}`, type: 'error' });
      } else {
          setCurrentUser(updatedUser); // Optimistic update
          setNotification({ message: 'Profile updated successfully.', type: 'success' });
          setView('dashboard');
      }
  };
  
  const handleSaveGroups = async (updatedGroups: Group[]) => {
      if (!supabase) return;
      const { error } = await supabase.from('groups').upsert(updatedGroups);
      if (error) {
          setNotification({ message: `Error saving groups: ${error.message}`, type: 'error' });
      } else {
          setGroups(updatedGroups);
          setNotification({ message: 'Groups and permissions saved successfully.', type: 'success' });
      }
  };

  const handleSaveUsers = async (updatedUsers: User[]) => {
      if (!supabase) return;
      const updates = updatedUsers
          .filter(u => {
              const originalUser = users.find(ou => ou.id === u.id);
              return originalUser && originalUser.groupId !== u.groupId;
          })
          .map(u => ({ id: u.id, group_id: u.groupId }));

      if (updates.length > 0) {
          const { error } = await supabase.from('profiles').upsert(updates);
          if (error) {
              setNotification({ message: `Error updating users: ${error.message}`, type: 'error' });
          } else {
              setNotification({ message: 'User groups updated successfully.', type: 'success' });
              setUsers(updatedUsers); // Optimistic update
          }
      }
  };

  const handleInviteUser = async (email: string, groupId: string): Promise<string> => {
      if (!supabase) return '';
      const code = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error } = await supabase.from('invitations').insert({
          id: code,
          email_for: email,
          group_id: groupId,
          expires_at: expiresAt.toISOString(),
      });

      if (error) {
          setNotification({ message: `Error creating invitation: ${error.message}`, type: 'error' });
          return '';
      } else {
          const { data, error: fetchError } = await supabase.from('invitations').select('*');
          if (!fetchError) setInvitations(data || []);
          return code;
      }
  };
  
  const handleAcceptInvitation = async (code: string, userDetails: { name: string; avatar: string; password: string }) => {
      if (!supabase) return;
      const invitation = invitations.find(inv => inv.id === code && inv.status === 'pending');
      if (!invitation) {
          alert("Invalid or already used invitation code.");
          return;
      }

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email: invitation.email_for,
          password: userDetails.password,
          options: {
              data: {
                  full_name: userDetails.name,
                  avatar_url: userDetails.avatar,
                  group_id: invitation.group_id,
              }
          }
      });

      if (signUpError) {
          alert(`Signup failed: ${signUpError.message}`);
          return;
      }
      
      if (user) {
          const { error: updateError } = await supabase.from('invitations').update({
              status: 'accepted',
              accepted_by_user_id: user.id
          }).eq('id', code);
          if (updateError) console.error("Failed to update invitation status:", updateError);
          alert('Registration successful! Please check your email to confirm your account, then you can log in.');
          setAuthView('login');
      }
  };
  // --- END SUPABASE & AUTH ---

  useEffect(() => { if (notification) { const timer = setTimeout(() => setNotification(null), 5000); return () => clearTimeout(timer); } }, [notification]);
  useEffect(() => { if (printingFarmer) { const handleAfterPrint = () => { setPrintingFarmer(null); window.removeEventListener('afterprint', handleAfterPrint); }; window.addEventListener('afterprint', handleAfterPrint); window.print(); return () => window.removeEventListener('afterprint', handleAfterPrint); } }, [printingFarmer]);
  useEffect(() => { if (pdfExportFarmer && pdfContainerRef.current) { html2canvas(pdfContainerRef.current, { scale: 2 }).then((canvas: HTMLCanvasElement) => { const { jsPDF } = jspdf; const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const ratio = canvas.height / canvas.width; let imgWidth = pdfWidth - 20; let imgHeight = imgWidth * ratio; if (imgHeight > pdfHeight - 20) { imgHeight = pdfHeight - 20; imgWidth = imgHeight / ratio; } const xOffset = (pdfWidth - imgWidth) / 2; const yOffset = (pdfHeight - imgHeight) / 2; pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight); pdf.save(`Farmer_Details_${pdfExportFarmer.farmerId}.pdf`); }).finally(() => setPdfExportFarmer(null)); } }, [pdfExportFarmer]);

  const handleRequestSort = useCallback((key: keyof Farmer | 'id') => { let direction: 'ascending' | 'descending' = 'ascending'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); }, [sortConfig]);
  
  const filteredFarmers = useMemo(() => {
    let farmers = allFarmers.filter(farmer => {
      const search = filters.searchQuery.toLowerCase();
      const matchesSearch = search === '' || farmer.fullName.toLowerCase().includes(search) || farmer.farmerId.toLowerCase().includes(search) || farmer.mobileNumber.includes(search);
      const matchesDistrict = filters.district === '' || farmer.district === filters.district;
      const matchesMandal = filters.mandal === '' || farmer.mandal === filters.mandal;
      const matchesVillage = filters.village === '' || farmer.village === filters.village;
      const matchesStatus = filters.status === '' || farmer.status === filters.status;
      let matchesDate = true;
      if (filters.registrationDateFrom && farmer.registrationDate < filters.registrationDateFrom) matchesDate = false;
      if (matchesDate && filters.registrationDateTo && farmer.registrationDate > filters.registrationDateTo) matchesDate = false;
      return matchesSearch && matchesDistrict && matchesMandal && matchesVillage && matchesStatus && matchesDate;
    });
    if (sortConfig !== null) {
        farmers.sort((a, b) => {
            const aValue = a[sortConfig.key]; const bValue = b[sortConfig.key];
            if (aValue === bValue) return 0; if (aValue === null || aValue === undefined) return 1; if (bValue === null || bValue === undefined) return -1;
            let comparison = String(aValue).localeCompare(String(bValue));
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }
    return farmers;
  }, [allFarmers, filters, sortConfig]);

  const handleFormSubmit = async (farmerData: Farmer, photoFile?: File) => {
    let photoUrl = farmerData.photo || '';
    if (photoFile && supabase && isOnline) {
        setSyncLoading(true);
        try {
            const filePath = `public/${farmerData.id}-${photoFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error: uploadError } = await supabase.storage.from('farmer-photos').upload(filePath, photoFile, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('farmer-photos').getPublicUrl(filePath);
            photoUrl = data.publicUrl;
        } catch(error) {
            console.error("Photo upload failed:", error);
            setNotification({ message: 'Photo upload failed. It will be saved without a photo.', type: 'error'});
        } finally {
            setSyncLoading(false);
        }
    }
    const farmerToSave = { ...farmerData, photo: photoUrl, syncStatus: 'pending' as const };
    await database.write(async () => { await farmersCollection.create(record => { Object.assign(record, farmerToSave); record._raw.id = farmerToSave.id; }); });
    setShowForm(false);
    setNewlyAddedFarmerId(farmerData.id);
    setNotification({ message: `Farmer "${farmerData.fullName}" successfully registered!`, type: 'success' });
  };
  
  const handleSelectAll = useCallback((isSelected: boolean) => { const filteredIds = new Set(filteredFarmers.map(f => f.id)); if (isSelected) { setSelectedFarmerIds(prev => Array.from(new Set([...prev, ...Array.from(filteredIds)]))); } else { setSelectedFarmerIds(prev => prev.filter(id => !filteredIds.has(id))); } }, [filteredFarmers]);
  const handleDeleteSelected = useCallback(() => { if (selectedFarmerIds.length === 0 || !currentUserPermissions.has(Permission.CAN_DELETE_FARMER)) return; setShowDeleteConfirmation(true); }, [selectedFarmerIds.length, currentUserPermissions]);
  const handleConfirmDelete = useCallback(async () => {
    if (selectedFarmerIds.length === 0) return;
    await database.write(async () => {
        const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
        const updates = farmersToDelete.map(farmer =>
            farmer.prepareUpdate(record => {
                record.syncStatus = 'pending_delete';
            })
        );
        await database.batch(...updates);
    });
    setNotification({ message: `${selectedFarmerIds.length} farmer(s) marked for deletion. They will be removed on the next sync.`, type: 'success' });
    setSelectedFarmerIds([]);
    setShowDeleteConfirmation(false);
  }, [selectedFarmerIds, database, farmersCollection]);

  const handleSaveRow = async (farmerToUpdate: FarmerModel, updatedData: Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>) => { try { await database.write(async () => { await farmerToUpdate.update(record => { if (updatedData.fullName) record.fullName = updatedData.fullName; if (updatedData.mobileNumber) record.mobileNumber = updatedData.mobileNumber; if (updatedData.status) record.status = updatedData.status; record.syncStatus = 'pending'; }); }); setEditingRowId(null); } catch (error) { console.error("Failed to save farmer:", error); alert("Failed to save changes. Please try again."); } };
  const handleBatchStatusUpdate = async (newStatus: FarmerStatus) => { if (selectedFarmerIds.length === 0) { alert("No farmers selected for batch update."); return; } await database.write(async () => { const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch(); const updates = farmersToUpdate.map(farmer => farmer.prepareUpdate(record => { record.status = newStatus; record.syncStatus = 'pending'; })); await database.batch(...updates); }); alert(`${selectedFarmerIds.length} farmer(s) have been updated to "${newStatus}".`); setSelectedFarmerIds([]); setShowBatchUpdateModal(false); };
  const handleSelectionChange = (farmerId: string, isSelected: boolean) => { setSelectedFarmerIds(prev => { const newSet = new Set(prev); if (isSelected) { newSet.add(farmerId); } else { newSet.delete(farmerId); } return Array.from(newSet); }); };
  const handleExportToExcel = useCallback(() => { const XLSX = (window as any).XLSX; if(!XLSX) { alert("Excel library not loaded!"); return; } const dataToExport = filteredFarmers.length > 0 ? filteredFarmers : allFarmers; if (dataToExport.length === 0) { alert("No farmers to export."); return; } const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(f => ({...f._raw, id: f.id}))); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Farmers"); XLSX.writeFile(workbook, "HapsaraFarmers.xlsx"); }, [allFarmers, filteredFarmers]);
  const handleExportToCsv = useCallback(() => { if (filteredFarmers.length === 0) { alert("No filtered data to export to CSV."); return; } const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: FarmerModel) => { try { if (type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district; const district = GEO_DATA.find(d => d.code === farmer.district); if (type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal; const mandal = district?.mandals.find(m => m.code === farmer.mandal); if (type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village; } catch (e) { return 'N/A'; } }; const headers = ['Hap ID', 'Application ID', 'Full Name', 'Father/Husband Name', 'Mobile Number', 'Aadhaar Number', 'Gender', 'District', 'Mandal', 'Village', 'Address', 'Status', 'Registration Date', 'Applied Extent (Acres)', 'Approved Extent (Acres)', 'Number of Plants', 'Plantation Date', 'Sync Status']; const escapeCsvCell = (cellData: any): string => { const stringData = String(cellData ?? ''); if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) return `"${stringData.replace(/"/g, '""')}"`; return stringData; }; const csvRows = filteredFarmers.map(farmer => [farmer.farmerId, farmer.applicationId, farmer.fullName, farmer.fatherHusbandName, farmer.mobileNumber, `'${farmer.aadhaarNumber}`, farmer.gender, getGeoName('district', farmer), getGeoName('mandal', farmer), getGeoName('village', farmer), farmer.address, farmer.status, farmer.registrationDate, farmer.appliedExtent, farmer.approvedExtent, farmer.numberOfPlants, farmer.plantationDate, farmer.syncStatus].map(escapeCsvCell).join(',')); const csvContent = [headers.join(','), ...csvRows].join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", "HapsaraFarmers_Filtered.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }, [filteredFarmers]);
  
  if (!isAppLaunched) return (<Suspense fallback={<div className="min-h-screen bg-gray-900" />}><LandingPage onLaunch={() => setIsAppLaunched(true)} /></Suspense>);
  if (!supabase) return (<Suspense fallback={<ModalLoader />}>{showSupabaseSettings && <SupabaseSettingsModal onSave={handleSaveSupabaseSettings} />}</Suspense>);
  
  if (!session || !currentUser) {
      const AuthFlow = () => {
          switch (authView) {
              case 'accept-invitation':
                  return <AcceptInvitation groups={groups} invitations={invitations} onAccept={handleAcceptInvitation} onBackToLogin={() => setAuthView('login')} />;
              case 'login':
              default:
                  return <LoginScreen supabase={supabase} onAcceptInvitationClick={() => setAuthView('accept-invitation')} />;
          }
      };
      return <Suspense fallback={<ModalLoader />}><AuthFlow /></Suspense>;
  }

  const renderDashboard = () => (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} onProfileClick={() => setView('profile')} onAdminClick={() => setView('admin')} onRegister={() => setShowForm(true)} onExport={handleExportToExcel} onExportCsv={handleExportToCsv} onImport={() => setShowImportModal(true)} onDeleteSelected={handleDeleteSelected} onBatchUpdate={() => setShowBatchUpdateModal(true)} syncLoading={syncLoading} selectedCount={selectedFarmerIds.length} isOnline={isOnline} pendingSyncCount={pendingSyncCount} permissions={currentUserPermissions} />
      <main className="p-6"><FilterBar onFilterChange={setFilters} /><FarmerList farmers={filteredFarmers} canEdit={currentUserPermissions.has(Permission.CAN_EDIT_FARMER)} canDelete={currentUserPermissions.has(Permission.CAN_DELETE_FARMER)} onDeleteSelected={handleDeleteSelected} editingRowId={editingRowId} onEditRow={setEditingRowId} onCancelEditRow={() => setEditingRowId(null)} onSaveRow={handleSaveRow} onPrint={setPrintingFarmer} onExportToPdf={setPdfExportFarmer} selectedFarmerIds={selectedFarmerIds} onSelectionChange={handleSelectionChange} onSelectAll={handleSelectAll} sortConfig={sortConfig} onRequestSort={handleRequestSort} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} /></main>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (<div className={`fixed top-5 right-6 z-[100] px-6 py-4 rounded-lg shadow-lg text-white transition-transform transform-gpu animate-fade-in-down ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}><div className="flex items-center"><span className="font-semibold">{notification.message}</span><button onClick={() => setNotification(null)} className="ml-4 font-bold text-xl leading-none">&times;</button></div></div>)}
      {view === 'dashboard' ? renderDashboard() : view === 'profile' ? (<Suspense fallback={<ModalLoader />}><ProfilePage currentUser={currentUser} groups={groups} onSave={handleSaveProfile} onBack={() => setView('dashboard')} /></Suspense>) : (<Suspense fallback={<ModalLoader />}><AdminPage users={users} groups={groups} currentUser={currentUser} onSaveUsers={handleSaveUsers} onSaveGroups={handleSaveGroups} onBack={() => setView('dashboard')} invitations={invitations} onInviteUser={handleInviteUser} /></Suspense>)}
      <Suspense fallback={<ModalLoader />}>
        {showForm && (<RegistrationForm onSubmit={handleFormSubmit} onCancel={() => { setShowForm(false); }} existingFarmers={allFarmers} />)}
        {showBatchUpdateModal && (<BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchStatusUpdate} onCancel={() => setShowBatchUpdateModal(false)} />)}
        {showImportModal && (<BulkImportModal onClose={() => setShowImportModal(false)} onSubmit={async () => {}} existingFarmers={allFarmers} />)}
        {showDeleteConfirmation && (<ConfirmationModal isOpen={showDeleteConfirmation} title="Confirm Deletion" message={<><p>Are you sure you want to mark <span className="font-bold">{selectedFarmerIds.length}</span> selected farmer(s) for deletion?</p><p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md font-semibold">They will be permanently removed after the next successful sync.</p></>} onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirmation(false)} confirmText="Yes, Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" />)}
      </Suspense>
      <Suspense fallback={null}>
        {pdfExportFarmer && (<div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}><div ref={pdfContainerRef}><PrintView farmer={pdfExportFarmer} isForPdf={true} /></div></div>)}
        <PrintView farmer={printingFarmer} />
      </Suspense>
    </div>
  );
};

export default App;
