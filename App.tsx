import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, User, Group, Permission, Invitation } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';
import FarmerList from './components/FarmerList';
import { useDatabase } from './DatabaseContext';
import { Q, Query } from '@nozbe/watermelondb';
import { FarmerModel } from './db';
import DataMenu from './components/DataMenu';
import { initializeSupabase, getSupabase } from './lib/supabase';

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
  onSync: () => void;
  onDeleteSelected: () => void;
  onBatchUpdate: () => void;
  syncLoading: boolean;
  selectedCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
  permissions: Set<Permission>;
}> = ({ currentUser, onLogout, onProfileClick, onAdminClick, onRegister, onExport, onExportCsv, onImport, onSync, onDeleteSelected, onBatchUpdate, syncLoading, selectedCount, isOnline, pendingSyncCount, permissions }) => {
  const canRegister = permissions.has(Permission.CAN_REGISTER_FARMER);
  const canSync = permissions.has(Permission.CAN_SYNC_DATA);
  const canDelete = permissions.has(Permission.CAN_DELETE_FARMER);
  const canEdit = permissions.has(Permission.CAN_EDIT_FARMER);
  const canManage = permissions.has(Permission.CAN_MANAGE_GROUPS) || permissions.has(Permission.CAN_MANAGE_USERS);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
          <h1 className="text-2xl font-bold text-gray-800">Hapsara Farmer Registration</h1>
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-colors`} title={isOnline ? 'Online' : 'Offline - Changes are saved locally'}></span>
              <span className="text-sm font-medium text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
              {pendingSyncCount > 0 && (<span className="text-sm text-blue-600 font-semibold animate-pulse">({pendingSyncCount} pending sync)</span>)}
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
          {canSync && (<button onClick={onSync} disabled={syncLoading || selectedCount === 0 || !isOnline} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold flex items-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed" title={!isOnline ? "Syncing is disabled while offline" : (selectedCount === 0 ? "Select farmers to sync" : "Sync selected farmers with the server")}>{syncLoading ? 'Syncing...' : `Sync Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}</button>)}
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [showSupabaseSettings, setShowSupabaseSettings] = useState(false);
  
  const [view, setView] = useState<'dashboard' | 'profile' | 'admin'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [printingFarmer, setPrintingFarmer] = useState<FarmerModel | null>(null);
  const [pdfExportFarmer, setPdfExportFarmer] = useState<FarmerModel | null>(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [syncData, setSyncData] = useState<{ farmersToSync: FarmerModel[] } | null>(null);
  const isOnline = useOnlineStatus();
  const [filters, setFilters] = useState<Filters>({ searchQuery: '', district: '', mandal: '', village: '', status: '', registrationDateFrom: '', registrationDateTo: '' });
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Farmer | 'id', direction: 'ascending' | 'descending' } | null>({ key: 'registrationDate', direction: 'descending' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

  const database = useDatabase();
  const farmersCollection = database.get<FarmerModel>('farmers');
  
  const allFarmers = useQuery(farmersCollection.query());
  const pendingSyncCount = useQuery(farmersCollection.query(Q.where('syncStatus', 'pending'))).length;
  
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
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    };
    getInitialSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setCurrentUser(null);
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase, fetchUserProfile]);

  useEffect(() => {
    if (!supabase) return;
    const fetchGroups = async () => {
      const { data, error } = await supabase.from('groups').select('*');
      if (error) console.error('Error fetching groups:', error);
      else setGroups(data || []);
    };
    fetchGroups();
  }, [supabase]);

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
    if (photoFile && supabase) {
        setSyncLoading(true);
        try {
            const filePath = `public/${farmerData.id}-${photoFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error: uploadError } = await supabase.storage.from('farmer-photos').upload(filePath, photoFile, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('farmer-photos').getPublicUrl(filePath);
            photoUrl = data.publicUrl;
        } catch(error) {
            console.error("Photo upload failed:", error);
            setNotification({ message: 'Photo upload failed. Please try again.', type: 'error'});
            setSyncLoading(false);
            return;
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
  
  const handleOpenSyncConfirmation = useCallback(async () => {
    if (selectedFarmerIds.length === 0) { alert("Please select at least one farmer to sync."); return; }
    if (!isOnline) { alert("You are currently offline. Please connect to the internet to sync."); return; }
    const farmersToSync = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
    if (farmersToSync.length === 0) { alert("Could not find selected farmers in local DB."); return; }
    setSyncData({ farmersToSync });
    setShowSyncConfirmation(true);
  }, [database, farmersCollection, selectedFarmerIds, isOnline]);

  const handleConfirmSync = useCallback(async () => {
    if (!syncData || !supabase) return;
    const { farmersToSync } = syncData;
    setShowSyncConfirmation(false);
    setSyncData(null);
    setSyncLoading(true);
    try {
        // Convert WatermelonDB models to plain objects for Supabase
        const plainFarmers = farmersToSync.map(f => {
          const plain = { ...f._raw, id: f.id };
          // Supabase might throw an error on extra properties from WatermelonDB
          delete (plain as any)._status;
          delete (plain as any)._changed;
          return plain;
        });
        const { error } = await supabase.from('farmers').upsert(plainFarmers);
        if (error) throw error;
        await database.write(async () => {
            const updates = farmersToSync.map(farmer => farmer.prepareUpdate(record => { record.syncStatus = 'synced'; }));
            await database.batch(...updates);
        });
        setNotification({ message: `Successfully synced ${farmersToSync.length} records!`, type: 'success' });
        setSelectedFarmerIds([]);
    } catch (error) {
        setNotification({ message: `Sync failed: ${(error as Error).message}`, type: 'error' });
    } finally {
        setSyncLoading(false);
    }
  }, [syncData, database, supabase]);

  const handleSelectAll = useCallback((isSelected: boolean) => { const filteredIds = new Set(filteredFarmers.map(f => f.id)); if (isSelected) { setSelectedFarmerIds(prev => Array.from(new Set([...prev, ...Array.from(filteredIds)]))); } else { setSelectedFarmerIds(prev => prev.filter(id => !filteredIds.has(id))); } }, [filteredFarmers]);
  const handleDeleteSelected = useCallback(() => { if (selectedFarmerIds.length === 0 || !currentUserPermissions.has(Permission.CAN_DELETE_FARMER)) return; setShowDeleteConfirmation(true); }, [selectedFarmerIds.length, currentUserPermissions]);
  const handleConfirmDelete = useCallback(async () => { if (selectedFarmerIds.length === 0) return; await database.write(async () => { const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch(); const deletions = farmersToDelete.map(farmer => farmer.prepareDestroyPermanently()); await database.batch(...deletions); }); setNotification({ message: `${selectedFarmerIds.length} farmer(s) have been permanently deleted.`, type: 'success' }); setSelectedFarmerIds([]); setShowDeleteConfirmation(false); }, [selectedFarmerIds, database, farmersCollection]);
  const handleSaveRow = async (farmerToUpdate: FarmerModel, updatedData: Partial<Pick<Farmer, 'fullName' | 'mobileNumber' | 'status'>>) => { try { await database.write(async () => { await farmerToUpdate.update(record => { if (updatedData.fullName) record.fullName = updatedData.fullName; if (updatedData.mobileNumber) record.mobileNumber = updatedData.mobileNumber; if (updatedData.status) record.status = updatedData.status; record.syncStatus = 'pending'; }); }); setEditingRowId(null); } catch (error) { console.error("Failed to save farmer:", error); alert("Failed to save changes. Please try again."); } };
  const handleBatchStatusUpdate = async (newStatus: FarmerStatus) => { if (selectedFarmerIds.length === 0) { alert("No farmers selected for batch update."); return; } await database.write(async () => { const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch(); const updates = farmersToUpdate.map(farmer => farmer.prepareUpdate(record => { record.status = newStatus; record.syncStatus = 'pending'; })); await database.batch(...updates); }); alert(`${selectedFarmerIds.length} farmer(s) have been updated to "${newStatus}".`); setSelectedFarmerIds([]); setShowBatchUpdateModal(false); };
  const handleSelectionChange = (farmerId: string, isSelected: boolean) => { setSelectedFarmerIds(prev => { const newSet = new Set(prev); if (isSelected) { newSet.add(farmerId); } else { newSet.delete(farmerId); } return Array.from(newSet); }); };
  const handleExportToExcel = useCallback(() => { const XLSX = (window as any).XLSX; if(!XLSX) { alert("Excel library not loaded!"); return; } const dataToExport = filteredFarmers.length > 0 ? filteredFarmers : allFarmers; if (dataToExport.length === 0) { alert("No farmers to export."); return; } const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(f => ({...f._raw, id: f.id}))); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Farmers"); XLSX.writeFile(workbook, "HapsaraFarmers.xlsx"); }, [allFarmers, filteredFarmers]);
  const handleExportToCsv = useCallback(() => { if (filteredFarmers.length === 0) { alert("No filtered data to export to CSV."); return; } const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: FarmerModel) => { try { if (type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district; const district = GEO_DATA.find(d => d.code === farmer.district); if (type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal; const mandal = district?.mandals.find(m => m.code === farmer.mandal); if (type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village; } catch (e) { return 'N/A'; } }; const headers = ['Hap ID', 'Application ID', 'Full Name', 'Father/Husband Name', 'Mobile Number', 'Aadhaar Number', 'Gender', 'District', 'Mandal', 'Village', 'Address', 'Status', 'Registration Date', 'Applied Extent (Acres)', 'Approved Extent (Acres)', 'Number of Plants', 'Plantation Date', 'Sync Status']; const escapeCsvCell = (cellData: any): string => { const stringData = String(cellData ?? ''); if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) return `"${stringData.replace(/"/g, '""')}"`; return stringData; }; const csvRows = filteredFarmers.map(farmer => [farmer.farmerId, farmer.applicationId, farmer.fullName, farmer.fatherHusbandName, farmer.mobileNumber, `'${farmer.aadhaarNumber}`, farmer.gender, getGeoName('district', farmer), getGeoName('mandal', farmer), getGeoName('village', farmer), farmer.address, farmer.status, farmer.registrationDate, farmer.appliedExtent, farmer.approvedExtent, farmer.numberOfPlants, farmer.plantationDate, farmer.syncStatus].map(escapeCsvCell).join(',')); const csvContent = [headers.join(','), ...csvRows].join('\n'); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", "HapsaraFarmers_Filtered.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }, [filteredFarmers]);
  
  if (!isAppLaunched) return (<Suspense fallback={<div className="min-h-screen bg-gray-900" />}><LandingPage onLaunch={() => setIsAppLaunched(true)} /></Suspense>);
  if (!supabase) return (<Suspense fallback={<ModalLoader />}>{showSupabaseSettings && <SupabaseSettingsModal onSave={handleSaveSupabaseSettings} />}</Suspense>);
  if (!session || !currentUser) return (<Suspense fallback={<ModalLoader />}><LoginScreen supabase={supabase} /></Suspense>);

  const renderDashboard = () => (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} onProfileClick={() => setView('profile')} onAdminClick={() => setView('admin')} onRegister={() => setShowForm(true)} onExport={handleExportToExcel} onExportCsv={handleExportToCsv} onImport={() => setShowImportModal(true)} onSync={handleOpenSyncConfirmation} onDeleteSelected={handleDeleteSelected} onBatchUpdate={() => setShowBatchUpdateModal(true)} syncLoading={syncLoading} selectedCount={selectedFarmerIds.length} isOnline={isOnline} pendingSyncCount={pendingSyncCount} permissions={currentUserPermissions} />
      <main className="p-6"><FilterBar onFilterChange={setFilters} /><FarmerList farmers={filteredFarmers} canEdit={currentUserPermissions.has(Permission.CAN_EDIT_FARMER)} canDelete={currentUserPermissions.has(Permission.CAN_DELETE_FARMER)} onDeleteSelected={handleDeleteSelected} editingRowId={editingRowId} onEditRow={setEditingRowId} onCancelEditRow={() => setEditingRowId(null)} onSaveRow={handleSaveRow} onPrint={setPrintingFarmer} onExportToPdf={setPdfExportFarmer} selectedFarmerIds={selectedFarmerIds} onSelectionChange={handleSelectionChange} onSelectAll={handleSelectAll} sortConfig={sortConfig} onRequestSort={handleRequestSort} newlyAddedFarmerId={newlyAddedFarmerId} onHighlightComplete={() => setNewlyAddedFarmerId(null)} /></main>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (<div className={`fixed top-5 right-6 z-[100] px-6 py-4 rounded-lg shadow-lg text-white transition-transform transform-gpu animate-fade-in-down ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}><div className="flex items-center"><span className="font-semibold">{notification.message}</span><button onClick={() => setNotification(null)} className="ml-4 font-bold text-xl leading-none">&times;</button></div></div>)}
      {view === 'dashboard' ? renderDashboard() : view === 'profile' ? (<Suspense fallback={<ModalLoader />}><ProfilePage currentUser={currentUser} groups={groups} onSave={() => {}} onBack={() => setView('dashboard')} /></Suspense>) : (<Suspense fallback={<ModalLoader />}><AdminPage users={[]} groups={groups} currentUser={currentUser} onSaveUsers={() => {}} onSaveGroups={() => {}} onBack={() => setView('dashboard')} invitations={[]} onInviteUser={() => ''} /></Suspense>)}
      <Suspense fallback={<ModalLoader />}>
        {showForm && (<RegistrationForm onSubmit={handleFormSubmit} onCancel={() => { setShowForm(false); }} existingFarmers={allFarmers} />)}
        {showBatchUpdateModal && (<BatchUpdateStatusModal selectedCount={selectedFarmerIds.length} onUpdate={handleBatchStatusUpdate} onCancel={() => setShowBatchUpdateModal(false)} />)}
        {showSyncConfirmation && syncData && (<SyncConfirmationModal syncCount={syncData.farmersToSync.length} apiUrl={"Supabase Backend"} onConfirm={handleConfirmSync} onCancel={() => { setShowSyncConfirmation(false); setSyncData(null); }} />)}
        {showImportModal && (<BulkImportModal onClose={() => setShowImportModal(false)} onSubmit={async () => {}} existingFarmers={allFarmers} />)}
        {showDeleteConfirmation && (<ConfirmationModal isOpen={showDeleteConfirmation} title="Confirm Deletion" message={<><p>Are you sure you want to permanently delete <span className="font-bold">{selectedFarmerIds.length}</span> selected farmer(s)?</p><p className="mt-2 text-sm text-red-700 font-semibold">This action cannot be undone.</p></>} onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteConfirmation(false)} confirmText="Yes, Delete" confirmButtonClass="bg-red-600 hover:bg-red-700" />)}
      </Suspense>
      <Suspense fallback={null}>
        {pdfExportFarmer && (<div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}><div ref={pdfContainerRef}><PrintView farmer={pdfExportFarmer} isForPdf={true} /></div></div>)}
        <PrintView farmer={printingFarmer} />
      </Suspense>
    </div>
  );
};

export default App;