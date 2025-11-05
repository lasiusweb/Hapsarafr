import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType, User, UserRole } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';

import { useDatabase } from './DatabaseContext';
import { Q, Query } from '@nozbe/watermelondb';
import { FarmerModel } from './db';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PrintView = lazy(() => import('./components/PrintView'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const BatchUpdateStatusModal = lazy(() => import('./components/BatchUpdateStatusModal'));
const SyncConfirmationModal = lazy(() => import('./components/SyncConfirmationModal'));
const BulkImportModal = lazy(() => import('./components/BulkImportModal'));

// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

// Custom hook for localStorage persistence (for non-database values)
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};

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

const useQueryCount = (query: Query<any>): number => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const subscription = query.observeCount().subscribe(setCount);
        return () => subscription.unsubscribe();
    }, [query]);
    return count;
};

const Header: React.FC<{
  currentUser: User | null;
  onLogout: () => void;
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
}> = ({ currentUser, onLogout, onRegister, onExport, onExportCsv, onImport, onSync, onDeleteSelected, onBatchUpdate, syncLoading, selectedCount, isOnline, pendingSyncCount }) => {
  const canRegister = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.DataEntry;
  const canImportExport = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.DataEntry;
  const canSync = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.DataEntry;
  const canDelete = currentUser?.role === UserRole.Admin;
  const canEdit = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.DataEntry;

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
          </svg>
          <h1 className="text-2xl font-bold text-gray-800">Hapsara Farmer Registration</h1>
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <span
                  className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} transition-colors`}
                  title={isOnline ? 'Online' : 'Offline - Changes are saved locally'}
              ></span>
              <span className="text-sm font-medium text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
              {pendingSyncCount > 0 && (
                  <span className="text-sm text-blue-600 font-semibold animate-pulse">({pendingSyncCount} pending sync)</span>
              )}
          </div>
      </div>
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="text-right border-r pr-4">
            <p className="font-semibold text-gray-800">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.role}</p>
          </div>
        )}
        <div className="flex gap-2">
          {canDelete && selectedCount > 0 && (
            <button
              onClick={onDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold flex items-center gap-2"
              title={`Delete ${selectedCount} selected farmer(s)`}
            >
              Delete Selected ({selectedCount})
            </button>
          )}
           {canEdit && selectedCount > 0 && (
            <button
              onClick={onBatchUpdate}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold flex items-center gap-2"
              title={`Update status for ${selectedCount} selected farmer(s)`}
            >
              Update Status ({selectedCount})
            </button>
          )}
          {canSync && (
            <button 
              onClick={onSync} 
              disabled={syncLoading || selectedCount === 0 || !isOnline} 
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold flex items-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
              title={!isOnline ? "Syncing is disabled while offline" : (selectedCount === 0 ? "Select farmers to sync" : "Sync selected farmers with the server")}
            >
              {syncLoading ? 'Syncing...' : `Sync Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </button>
          )}
          {canImportExport && (
            <>
              <button onClick={onExportCsv} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                Export to CSV
              </button>
              <button onClick={onExport} className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition font-semibold flex items-center gap-2">
                Export to Excel
              </button>
              <button onClick={onImport} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition font-semibold flex items-center gap-2">
                Import from Excel
              </button>
            </>
          )}
          {canRegister && (
            <button onClick={onRegister} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold flex items-center gap-2">
              Register New Farmer
            </button>
          )}
        </div>
        <button onClick={onLogout} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-semibold">Logout</button>
      </div>
    </header>
  );
};

const FarmerList: React.FC<{
    farmers: FarmerModel[];
    currentUser: User | null;
    onEdit: (farmer: FarmerModel) => void;
    onPrint: (farmer: FarmerModel) => void;
    onExportToPdf: (farmer: FarmerModel) => void;
    selectedFarmerIds: string[];
    onSelectionChange: (farmerId: string, isSelected: boolean) => void;
    onSelectAll: (allSelected: boolean) => void;
}> = ({ farmers, currentUser, onEdit, onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll }) => {
    
    const StatusBadge: React.FC<{status: FarmerStatus}> = ({ status }) => {
        const colors: Record<FarmerStatus, string> = {
            [FarmerStatus.Registered]: 'bg-blue-100 text-blue-800',
            [FarmerStatus.Sanctioned]: 'bg-yellow-100 text-yellow-800',
            [FarmerStatus.Planted]: 'bg-green-100 text-green-800',
            [FarmerStatus.PaymentDone]: 'bg-purple-100 text-purple-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    const getGeoName = (type: 'district'|'mandal'|'village', farmer: FarmerModel) => {
        try {
            if(type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district;
            const district = GEO_DATA.find(d => d.code === farmer.district);
            if(type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal;
            const mandal = district?.mandals.find(m => m.code === farmer.mandal);
            if(type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village;
        } catch(e) {
            return 'N/A';
        }
    };
    
    if (farmers.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500 bg-white shadow-md rounded-lg">
                <h2 className="text-2xl font-semibold">No Farmers Found</h2>
                <p className="mt-2">Try adjusting your search criteria, or click "Register New Farmer" to add one.</p>
            </div>
        );
    }
    
    const allVisibleSelected = farmers.length > 0 && farmers.every(f => selectedFarmerIds.includes(f.id));
    const canEdit = currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.DataEntry;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                checked={allVisibleSelected}
                                onChange={(e) => onSelectAll(e.target.checked)}
                                aria-label="Select all farmers"
                            />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Synced</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {farmers.map(farmer => (
                    <tr key={farmer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                checked={selectedFarmerIds.includes(farmer.id)}
                                onChange={(e) => onSelectionChange(farmer.id, e.target.checked)}
                                aria-label={`Select farmer ${farmer.fullName}`}
                            />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{farmer.farmerId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farmer.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${getGeoName('village', farmer)}, ${getGeoName('mandal', farmer)}`}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{farmer.mobileNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={farmer.status as FarmerStatus} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center">
                                <span 
                                    className={`h-3 w-3 rounded-full ${farmer.syncStatus === 'synced' ? 'bg-green-500' : 'bg-yellow-400'}`}
                                    title={farmer.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}
                                >
                                    <span className="sr-only">{farmer.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}</span>
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                           {canEdit && <button onClick={() => onEdit(farmer)} className="text-indigo-600 hover:text-indigo-900">Edit</button>}
                           <button onClick={() => onPrint(farmer)} className="text-green-600 hover:text-green-900">Print</button>
                           <button onClick={() => onExportToPdf(farmer)} className="text-blue-600 hover:text-blue-900">PDF</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const ModalLoader: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" aria-label="Loading form" role="dialog" aria-modal="true">
        <div className="bg-white rounded-lg shadow-2xl p-8 flex items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg font-medium text-gray-700">Loading...</span>
        </div>
    </div>
);

const App: React.FC = () => {
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [showForm, setShowForm] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<FarmerModel | null>(null);
  const [printingFarmer, setPrintingFarmer] = useState<FarmerModel | null>(null);
  const [pdfExportFarmer, setPdfExportFarmer] = useState<FarmerModel | null>(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [backendApiUrl, setBackendApiUrl] = useLocalStorage<string>('backendApiUrl', '');
  const [syncLoading, setSyncLoading] = useState(false);
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showSyncConfirmation, setShowSyncConfirmation] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [syncData, setSyncData] = useState<{ farmersToSync: FarmerModel[], url: string } | null>(null);
  const isOnline = useOnlineStatus();
  const [filters, setFilters] = useState<Filters>({
    searchQuery: '',
    district: '',
    mandal: '',
    village: '',
    status: '',
  });
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const database = useDatabase();
  const farmersCollection = database.get<FarmerModel>('farmers');
  
  const allFarmers = useQuery(farmersCollection.query());
  const pendingSyncCount = useQueryCount(farmersCollection.query(Q.where('syncStatus', 'pending')));

  useEffect(() => {
    const migrateFromLocalStorage = async () => {
      const migrated = localStorage.getItem('watermelon_migrated');
      if (migrated) return;
  
      const localFarmersJSON = localStorage.getItem('farmers');
      // Use a type that includes the old `syncedToSheets` property
      type OldFarmer = Farmer & { syncedToSheets?: boolean };
      if (!localFarmersJSON) {
          localStorage.setItem('watermelon_migrated', 'true');
          return;
      }
  
      const localFarmers: OldFarmer[] = JSON.parse(localFarmersJSON);
      if (localFarmers.length === 0) {
          localStorage.setItem('watermelon_migrated', 'true');
          return;
      }
      
      console.log(`Migrating ${localFarmers.length} farmers from localStorage to WatermelonDB...`);
  
      try {
          await database.write(async () => {
              const preparedCreations = localFarmers.map(farmer =>
                  farmersCollection.prepareCreate(record => {
                      Object.keys(farmer).forEach(key => {
                          if (key !== 'id' && key !== 'syncedToSheets') {
                              (record as any)[key] = farmer[key as keyof OldFarmer];
                          }
                      });
                      record.syncStatus = farmer.syncedToSheets ? 'synced' : 'pending';
                      record._raw.id = farmer.id;
                  })
              );
              await database.batch(...preparedCreations);
          });
          console.log("Migration successful!");
          localStorage.setItem('watermelon_migrated', 'true');
          localStorage.removeItem('farmers');
          localStorage.removeItem('syncQueue');
      } catch (error) {
          console.error("WatermelonDB migration failed:", error);
      }
    };
  
    migrateFromLocalStorage();
  }, [database, farmersCollection]);

  const filteredFarmers = useMemo(() => {
    return allFarmers.filter(farmer => {
      const search = filters.searchQuery.toLowerCase();
      const matchesSearch = search === '' ||
        farmer.fullName.toLowerCase().includes(search) ||
        farmer.farmerId.toLowerCase().includes(search) ||
        farmer.mobileNumber.includes(search);
      
      const matchesDistrict = filters.district === '' || farmer.district === filters.district;
      const matchesMandal = filters.mandal === '' || farmer.mandal === filters.mandal;
      const matchesVillage = filters.village === '' || farmer.village === filters.village;
      const matchesStatus = filters.status === '' || farmer.status === filters.status;
      
      return matchesSearch && matchesDistrict && matchesMandal && matchesVillage && matchesStatus;
    }).sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [allFarmers, filters]);


  const syncOfflineChanges = useCallback(async () => {
      const pendingFarmers = await farmersCollection.query(Q.where('syncStatus', 'pending')).fetch();
      if (!isOnline || pendingFarmers.length === 0) return;
      
      let url = backendApiUrl;
      if (!url) {
          console.log("Backend API URL is not set. Aborting automatic sync.");
          return;
      }
      
      console.log(`Attempting to sync ${pendingFarmers.length} pending changes...`);
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ farmers: pendingFarmers }),
          });
          
          if (!response.ok) {
            throw new Error(`Automatic sync failed with status: ${response.status}`);
          }
          
          await database.write(async () => {
            const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(pendingFarmers.map(f => f.id)))).fetch();
            const updates = farmersToUpdate.map(farmer => farmer.prepareUpdate(record => {
                record.syncStatus = 'synced';
            }));
            await database.batch(...updates);
        });

          console.log(`Successfully synced ${pendingFarmers.length} pending changes.`);
      } catch (error) {
          console.error("Error during automatic sync:", error);
      }
  }, [isOnline, backendApiUrl, database, farmersCollection]);

  useEffect(() => {
      if (isOnline && pendingSyncCount > 0) {
          const timer = setTimeout(() => syncOfflineChanges(), 2000);
          return () => clearTimeout(timer);
      }
  }, [isOnline, pendingSyncCount, syncOfflineChanges]);

  useEffect(() => {
    if (printingFarmer) {
      const handleAfterPrint = () => {
        setPrintingFarmer(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [printingFarmer]);
  
  const handleExportToPdf = (farmer: FarmerModel) => {
    setPdfExportFarmer(farmer);
  };

  useEffect(() => {
    if (pdfExportFarmer && pdfContainerRef.current) {
        const pdfElement = pdfContainerRef.current;
        html2canvas(pdfElement, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
            const { jsPDF } = jspdf;
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = canvas.height / canvas.width;
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth * ratio;
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight / ratio;
            }
            const xOffset = (pdfWidth - imgWidth) / 2;
            const yOffset = (pdfHeight - imgHeight) / 2;
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
            pdf.save(`Farmer_Details_${pdfExportFarmer.farmerId}.pdf`);
        }).catch((err: any) => {
            console.error("Error generating PDF:", err);
            alert("Could not generate PDF. Please try again.");
        }).finally(() => {
            setPdfExportFarmer(null);
        });
    }
  }, [pdfExportFarmer]);

  const handleRegisterClick = () => {
    setEditingFarmer(null);
    setShowForm(true);
  };
  
  const handleEditClick = (farmer: FarmerModel) => {
    setEditingFarmer(farmer);
    setShowForm(true);
  };

  const handleFormSubmit = async (farmerData: Farmer) => {
    const farmerToSave = { ...farmerData, syncStatus: 'pending' as const };
    
    await database.write(async () => {
      if (editingFarmer) {
        const farmerRecord = await farmersCollection.find(editingFarmer.id);
        await farmerRecord.update(record => {
          Object.assign(record, farmerToSave);
        });
      } else {
        await farmersCollection.create(record => {
          Object.assign(record, farmerToSave);
          record._raw.id = farmerToSave.id;
        });
      }
    });

    setShowForm(false);
    setEditingFarmer(null);
  };

  const handleBulkImportSubmit = async (newFarmers: Farmer[]) => {
    if (newFarmers.length === 0) {
        alert("No valid farmer records to import.");
        return;
    }

    try {
        await database.write(async () => {
            const preparedCreations = newFarmers.map(farmer => 
                farmersCollection.prepareCreate(record => {
                    Object.assign(record, farmer);
                    record._raw.id = farmer.id;
                })
            );
            await database.batch(...preparedCreations);
        });
    } catch (error) {
        console.error("Error during bulk import database operation:", error);
        alert(`Failed to save imported farmers to the database. Error: ${(error as Error).message}`);
    }
  };
  
  const handleSelectionChange = (farmerId: string, isSelected: boolean) => {
    setSelectedFarmerIds(prev => {
        const newSet = new Set(prev);
        if (isSelected) { newSet.add(farmerId); } else { newSet.delete(farmerId); }
        return Array.from(newSet);
    });
  };

  const handleSelectAll = useCallback((isSelected: boolean) => {
      const filteredIds = new Set(filteredFarmers.map(f => f.id));
      if (isSelected) {
          setSelectedFarmerIds(prev => Array.from(new Set([...prev, ...Array.from(filteredIds)])));
      } else {
          setSelectedFarmerIds(prev => prev.filter(id => !filteredIds.has(id)));
      }
  }, [filteredFarmers]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedFarmerIds.length === 0 || currentUser?.role !== UserRole.Admin) return;
    if (window.confirm(`Are you sure you want to permanently delete ${selectedFarmerIds.length} selected farmer(s)? This action cannot be undone.`)) {
      await database.write(async () => {
        const farmersToDelete = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
        const deletions = farmersToDelete.map(farmer => farmer.prepareDestroyPermanently());
        await database.batch(...deletions);
      });
      setSelectedFarmerIds([]);
    }
  }, [selectedFarmerIds, currentUser?.role, database, farmersCollection]);
  
  const handleBatchStatusUpdate = async (newStatus: FarmerStatus) => {
    if (selectedFarmerIds.length === 0) {
        alert("No farmers selected for batch update.");
        return;
    }
    await database.write(async () => {
      const farmersToUpdate = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds))).fetch();
      const updates = farmersToUpdate.map(farmer => farmer.prepareUpdate(record => {
        record.status = newStatus;
        record.syncStatus = 'pending';
      }));
      await database.batch(...updates);
    });
    alert(`${selectedFarmerIds.length} farmer(s) have been updated to "${newStatus}".`);
    setSelectedFarmerIds([]);
    setShowBatchUpdateModal(false);
  };

  const handleExportToExcel = useCallback(() => {
    // @ts-ignore
    const XLSX = window.XLSX;
    if(!XLSX) { alert("Excel library not loaded!"); return; }
    const dataToExport = filteredFarmers.length > 0 ? filteredFarmers : allFarmers;
    if (dataToExport.length === 0) { alert("No farmers to export."); return; }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(f => ({...f._raw, id: f.id})));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Farmers");
    XLSX.writeFile(workbook, "HapsaraFarmers.xlsx");
  }, [allFarmers, filteredFarmers]);

    const handleExportToCsv = useCallback(() => {
        if (filteredFarmers.length === 0) {
            alert("No filtered data to export to CSV.");
            return;
        }
        const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: FarmerModel) => {
            try {
                if (type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district;
                const district = GEO_DATA.find(d => d.code === farmer.district);
                if (type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal;
                const mandal = district?.mandals.find(m => m.code === farmer.mandal);
                if (type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village;
            } catch (e) { return 'N/A'; }
        };
        const headers = ['Farmer ID', 'Application ID', 'Full Name', 'Father/Husband Name', 'Mobile Number', 'Aadhaar Number', 'Gender', 'District', 'Mandal', 'Village', 'Address', 'Status', 'Registration Date', 'Applied Extent (Acres)', 'Approved Extent (Acres)', 'Number of Plants', 'Plantation Date', 'Sync Status'];
        const escapeCsvCell = (cellData: any): string => {
            const stringData = String(cellData ?? '');
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };
        const csvRows = filteredFarmers.map(farmer => [farmer.farmerId, farmer.applicationId, farmer.fullName, farmer.fatherHusbandName, farmer.mobileNumber, `'${farmer.aadhaarNumber}`, farmer.gender, getGeoName('district', farmer), getGeoName('mandal', farmer), getGeoName('village', farmer), farmer.address, farmer.status, farmer.registrationDate, farmer.appliedExtent, farmer.approvedExtent, farmer.numberOfPlants, farmer.plantationDate, farmer.syncStatus].map(escapeCsvCell).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "HapsaraFarmers_Filtered.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredFarmers]);
  
  const handleConfirmSync = useCallback(async () => {
    if (!syncData) return;

    const { farmersToSync, url } = syncData;

    setShowSyncConfirmation(false);
    setSyncData(null);
    setSyncLoading(true);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farmers: farmersToSync }),
        });
        if (!response.ok) throw new Error(`Server responded with status ${response.status}.`);

        await database.write(async () => {
            const updates = farmersToSync.map(farmer => farmer.prepareUpdate(record => {
                record.syncStatus = 'synced';
            }));
            await database.batch(...updates);
        });

        alert(`Successfully synced ${farmersToSync.length} records!`);
        setSelectedFarmerIds([]);
    } catch (error) {
        let msg = error instanceof TypeError && error.message.includes('Failed to fetch')
          ? "Sync failed. Could not connect to the server."
          : `Sync failed: ${(error as Error).message}`;
        alert(msg);
    } finally {
        setSyncLoading(false);
    }
  }, [syncData, database]);

  const handleOpenSyncConfirmation = useCallback(async () => {
    if (selectedFarmerIds.length === 0) { alert("Please select at least one farmer to sync."); return; }
    if (!isOnline) { alert("You are currently offline. Please connect to the internet to sync."); return; }

    let url = backendApiUrl;
    if(!url) {
      url = prompt("Please enter your Backend API Endpoint URL:") || '';
      setBackendApiUrl(url);
    }
    if(!url){ alert("Backend API URL is required for syncing."); return; }
    
    const farmersToSync = await farmersCollection.query(Q.where('id', Q.oneOf(selectedFarmerIds)), Q.where('syncStatus', 'pending')).fetch();
    if(farmersToSync.length === 0){ alert("All selected farmers are already in sync."); return; }

    setSyncData({ farmersToSync, url });
    setShowSyncConfirmation(true);

  }, [backendApiUrl, setBackendApiUrl, database, farmersCollection, selectedFarmerIds, isOnline]);
  
  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => setCurrentUser(null);

  if (!isAppLaunched) {
      return (
          <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
              <LandingPage onLaunch={() => setIsAppLaunched(true)} />
          </Suspense>
      );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<ModalLoader />}>
        <LoginScreen onLogin={handleLogin} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onRegister={handleRegisterClick} 
        onExport={handleExportToExcel}
        onExportCsv={handleExportToCsv}
        onImport={() => setShowImportModal(true)}
        onSync={handleOpenSyncConfirmation}
        onDeleteSelected={handleDeleteSelected}
        onBatchUpdate={() => setShowBatchUpdateModal(true)}
        syncLoading={syncLoading}
        selectedCount={selectedFarmerIds.length}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
      />
      <main className="p-6">
        <FilterBar onFilterChange={setFilters} />
        <FarmerList 
            farmers={filteredFarmers}
            currentUser={currentUser}
            onEdit={handleEditClick} 
            onPrint={setPrintingFarmer}
            onExportToPdf={handleExportToPdf}
            selectedFarmerIds={selectedFarmerIds}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
        />
      </main>
      
      <Suspense fallback={<ModalLoader />}>
        {showForm && (
          <RegistrationForm 
              onSubmit={handleFormSubmit} 
              onCancel={() => { setShowForm(false); setEditingFarmer(null); }} 
              initialData={editingFarmer}
              existingFarmers={allFarmers}
          />
        )}
        {showBatchUpdateModal && (
            <BatchUpdateStatusModal
                selectedCount={selectedFarmerIds.length}
                onUpdate={handleBatchStatusUpdate}
                onCancel={() => setShowBatchUpdateModal(false)}
            />
        )}
        {showSyncConfirmation && syncData && (
            <SyncConfirmationModal
                syncCount={syncData.farmersToSync.length}
                apiUrl={syncData.url}
                onConfirm={handleConfirmSync}
                onCancel={() => {
                    setShowSyncConfirmation(false);
                    setSyncData(null);
                }}
            />
        )}
        {showImportModal && (
          <BulkImportModal
              onClose={() => setShowImportModal(false)}
              onSubmit={handleBulkImportSubmit}
              existingFarmers={allFarmers}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {pdfExportFarmer && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
            <div ref={pdfContainerRef}>
              <PrintView farmer={pdfExportFarmer} isForPdf={true} />
            </div>
          </div>
        )}
        <PrintView farmer={printingFarmer} />
      </Suspense>
    </div>
  );
};

export default App;