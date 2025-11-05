import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType } from './types';
import { GEO_DATA } from './data/geoData';
import FilterBar, { Filters } from './components/FilterBar';

// Lazily import components to enable code-splitting
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PrintView = lazy(() => import('./components/PrintView'));
const LandingPage = lazy(() => import('./components/LandingPage'));


// Type declarations for CDN libraries
declare const html2canvas: any;
declare const jspdf: any;

// Custom hook for localStorage persistence
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


const Header: React.FC<{
  onRegister: () => void;
  onExport: () => void;
  onExportCsv: () => void;
  onImport: () => void;
  onSync: () => void;
  onDeleteSelected: () => void;
  syncLoading: boolean;
  selectedCount: number;
  isOnline: boolean;
  pendingSyncCount: number;
}> = ({ onRegister, onExport, onExportCsv, onImport, onSync, onDeleteSelected, syncLoading, selectedCount, isOnline, pendingSyncCount }) => (
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
    <div className="flex gap-2">
      {selectedCount > 0 && (
        <button
          onClick={onDeleteSelected}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold flex items-center gap-2"
          title={`Delete ${selectedCount} selected farmer(s)`}
        >
          Delete Selected ({selectedCount})
        </button>
      )}
      <button 
        onClick={onSync} 
        disabled={syncLoading || selectedCount === 0 || !isOnline} 
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold flex items-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
        title={!isOnline ? "Syncing is disabled while offline" : (selectedCount === 0 ? "Select farmers to sync" : "Sync selected farmers to Google Sheets")}
      >
        {syncLoading ? 'Syncing...' : `Sync Selected${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
      </button>
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
      <button onClick={onRegister} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold flex items-center gap-2">
        Register New Farmer
      </button>
    </div>
  </header>
);

const FarmerList: React.FC<{
    farmers: Farmer[];
    onEdit: (farmer: Farmer) => void;
    onPrint: (farmer: Farmer) => void;
    onExportToPdf: (farmer: Farmer) => void;
    selectedFarmerIds: string[];
    onSelectionChange: (farmerId: string, isSelected: boolean) => void;
    onSelectAll: (allSelected: boolean) => void;
}> = ({ farmers, onEdit, onPrint, onExportToPdf, selectedFarmerIds, onSelectionChange, onSelectAll }) => {
    
    const StatusBadge: React.FC<{status: FarmerStatus}> = ({ status }) => {
        const colors: Record<FarmerStatus, string> = {
            [FarmerStatus.Registered]: 'bg-blue-100 text-blue-800',
            [FarmerStatus.Sanctioned]: 'bg-yellow-100 text-yellow-800',
            [FarmerStatus.Planted]: 'bg-green-100 text-green-800',
            [FarmerStatus.PaymentDone]: 'bg-purple-100 text-purple-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    const getGeoName = (type: 'district'|'mandal'|'village', farmer: Farmer) => {
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={farmer.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center">
                                <span 
                                    className={`h-3 w-3 rounded-full ${farmer.syncedToSheets ? 'bg-green-500' : 'bg-yellow-400'}`}
                                    title={farmer.syncedToSheets ? 'Synced' : 'Pending Sync'}
                                >
                                    <span className="sr-only">{farmer.syncedToSheets ? 'Synced' : 'Pending Sync'}</span>
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                           <button onClick={() => onEdit(farmer)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
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
            <span className="text-lg font-medium text-gray-700">Loading Form...</span>
        </div>
    </div>
);

const App: React.FC = () => {
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [farmers, setFarmers] = useLocalStorage<Farmer[]>('farmers', []);
  const [showForm, setShowForm] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [printingFarmer, setPrintingFarmer] = useState<Farmer | null>(null);
  const [pdfExportFarmer, setPdfExportFarmer] = useState<Farmer | null>(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useLocalStorage<string>('googleSheetsWebhookUrl', '');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncQueue, setSyncQueue] = useLocalStorage<Farmer[]>('syncQueue', []);
  const isOnline = useOnlineStatus();
  const [filters, setFilters] = useState<Filters>({
    searchQuery: '',
    district: '',
    mandal: '',
    village: '',
    status: '',
  });
  const importFileRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const filteredFarmers = useMemo(() => {
    return farmers.filter(farmer => {
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
  }, [farmers, filters]);


  const syncOfflineChanges = useCallback(async () => {
      if (!isOnline || syncQueue.length === 0) return;
      
      let url = webhookUrl;
      if (!url) {
          console.log("Webhook URL is not set. Aborting automatic sync.");
          return;
      }
      
      console.log(`Attempting to sync ${syncQueue.length} pending changes...`);
      try {
          // Using 'no-cors' mode, we won't get a real response object, but the request will be sent.
          await fetch(url, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ farmers: syncQueue }),
          });

          const syncedIds = new Set(syncQueue.map(f => f.id));
          setFarmers(prev => prev.map(f => syncedIds.has(f.id) ? { ...f, syncedToSheets: true } : f));
          setSyncQueue([]);
          alert(`Successfully synced ${syncQueue.length} pending changes.`);

      } catch (error) {
          console.error("Error during automatic sync:", error);
          alert("Failed to sync pending changes. The app will retry automatically when connection is stable.");
      }
  }, [isOnline, syncQueue, webhookUrl, setFarmers, setSyncQueue]);

  useEffect(() => {
      if (isOnline && syncQueue.length > 0) {
          const timer = setTimeout(() => syncOfflineChanges(), 2000); // Debounce to avoid rapid firing
          return () => clearTimeout(timer);
      }
  }, [isOnline, syncQueue.length, syncOfflineChanges]);

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
  
  const handleExportToPdf = (farmer: Farmer) => {
    setPdfExportFarmer(farmer);
  };

  useEffect(() => {
    if (pdfExportFarmer && pdfContainerRef.current) {
        const pdfElement = pdfContainerRef.current;
        html2canvas(pdfElement, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.height / imgProps.width;
            
            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth * ratio;

            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = imgHeight / ratio;
            }
            
            const xOffset = (pdfWidth - imgWidth) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, 0, imgWidth, imgHeight);
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
  
  const handleEditClick = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setShowForm(true);
  };

  const handleFormSubmit = (farmerData: Farmer) => {
    const updatedFarmerData = { ...farmerData, syncedToSheets: false };

    if (editingFarmer) {
      setFarmers(prev => prev.map(f => f.id === updatedFarmerData.id ? updatedFarmerData : f));
    } else {
      setFarmers(prev => [...prev, updatedFarmerData]);
    }
    
    // Add/update farmer in the sync queue, ensuring no duplicates
    setSyncQueue(prev => [...prev.filter(f => f.id !== updatedFarmerData.id), updatedFarmerData]);
    
    setShowForm(false);
    setEditingFarmer(null);
  };
  
  const handleSelectionChange = (farmerId: string, isSelected: boolean) => {
    setSelectedFarmerIds(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
            newSet.add(farmerId);
        } else {
            newSet.delete(farmerId);
        }
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

  const handleDeleteSelected = useCallback(() => {
    if (selectedFarmerIds.length === 0) {
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${selectedFarmerIds.length} selected farmer(s)? This action cannot be undone.`);
    if (confirmed) {
      const selectedIds = new Set(selectedFarmerIds);
      setFarmers(prev => prev.filter(f => !selectedIds.has(f.id)));
      setSyncQueue(prev => prev.filter(f => !selectedIds.has(f.id)));
      setSelectedFarmerIds([]);
    }
  }, [selectedFarmerIds, setFarmers, setSyncQueue]);

  const handleExportToExcel = useCallback(() => {
    // @ts-ignore
    const XLSX = window.XLSX;
    if(!XLSX) {
        alert("Excel library not loaded!");
        return;
    }
    const dataToExport = filteredFarmers.length > 0 ? filteredFarmers : farmers;
    if (dataToExport.length === 0) {
        alert("No farmers to export.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Farmers");
    XLSX.writeFile(workbook, "HapsaraFarmers.xlsx");
  }, [farmers, filteredFarmers]);

    const handleExportToCsv = useCallback(() => {
        const dataToExport = filteredFarmers;
        if (dataToExport.length === 0) {
            alert("No filtered data to export to CSV.");
            return;
        }

        const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: Farmer) => {
            try {
                if (type === 'district') return GEO_DATA.find(d => d.code === farmer.district)?.name || farmer.district;
                const district = GEO_DATA.find(d => d.code === farmer.district);
                if (type === 'mandal') return district?.mandals.find(m => m.code === farmer.mandal)?.name || farmer.mandal;
                const mandal = district?.mandals.find(m => m.code === farmer.mandal);
                if (type === 'village') return mandal?.villages.find(v => v.code === farmer.village)?.name || farmer.village;
            } catch (e) {
                return 'N/A';
            }
        };

        const headers = [
            'Farmer ID', 'Application ID', 'Full Name', 'Father/Husband Name', 'Mobile Number', 'Aadhaar Number',
            'Gender', 'District', 'Mandal', 'Village', 'Address', 'Status', 'Registration Date',
            'Applied Extent (Acres)', 'Approved Extent (Acres)', 'Number of Plants', 'Plantation Date',
            'Synced to Sheets'
        ];

        const escapeCsvCell = (cellData: any): string => {
            const stringData = String(cellData ?? '');
            if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };

        const csvRows = dataToExport.map(farmer => [
            farmer.farmerId,
            farmer.applicationId,
            farmer.fullName,
            farmer.fatherHusbandName,
            farmer.mobileNumber,
            `'${farmer.aadhaarNumber}`,
            farmer.gender,
            getGeoName('district', farmer),
            getGeoName('mandal', farmer),
            getGeoName('village', farmer),
            farmer.address,
            farmer.status,
            farmer.registrationDate,
            farmer.appliedExtent,
            farmer.approvedExtent,
            farmer.numberOfPlants,
            farmer.plantationDate,
            farmer.syncedToSheets ? 'Yes' : 'No'
        ].map(escapeCsvCell).join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "HapsaraFarmers_Filtered.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredFarmers]);


  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      alert("Excel library not loaded!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          alert("The Excel file is empty or has an invalid format.");
          return;
        }

        const requiredColumns = ['fullName', 'fatherHusbandName', 'aadhaarNumber', 'mobileNumber', 'district', 'mandal', 'village', 'registrationDate'];
        const headers = Object.keys(json[0] || {});
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          alert(`Import failed. The file must contain the following columns: ${requiredColumns.join(', ')}.\nMissing: ${missingColumns.join(', ')}`);
          return;
        }

        const newFarmers: Farmer[] = [];
        const errors: string[] = [];
        const sequenceCounters: { [key: string]: number } = {};

        farmers.forEach(f => {
          try {
            const regYear = new Date(f.registrationDate).getFullYear().toString().slice(-2);
            const key = `${f.district}${f.mandal}${f.village}${regYear}`;
            const seq = parseInt(f.farmerId.slice(-3), 10);
            if (!sequenceCounters[key] || seq > sequenceCounters[key]) {
              sequenceCounters[key] = seq;
            }
          } catch(err) {
            console.warn(`Could not parse farmerId for sequence counter: ${f.farmerId}`, err);
          }
        });

        json.forEach((row, index) => {
          const rowNum = index + 2;
          try {
            if (!row.fullName || !row.aadhaarNumber || !row.mobileNumber || !row.district || !row.mandal || !row.village || !row.registrationDate) {
              errors.push(`Row ${rowNum}: Missing one or more required fields (fullName, aadhaarNumber, mobileNumber, district, mandal, village, registrationDate).`);
              return;
            }

            const currentAadhaar = String(row.aadhaarNumber);
            if (!/^\d{12}$/.test(currentAadhaar)) {
              errors.push(`Row ${rowNum}: Invalid Aadhaar for '${row.fullName}'. Must be 12 digits.`);
              return;
            }
            
            // Check for duplicates in existing data and in the current import batch
            if (farmers.some(f => f.aadhaarNumber === currentAadhaar)) {
                errors.push(`Row ${rowNum}: Farmer with Aadhaar ${currentAadhaar} already exists. Skipped.`);
                return;
            }
            if (newFarmers.some(f => f.aadhaarNumber === currentAadhaar)) {
                errors.push(`Row ${rowNum}: Duplicate Aadhaar ${currentAadhaar} found in the Excel file. Skipped.`);
                return;
            }

            if (!/^[6-9]\d{9}$/.test(String(row.mobileNumber))) {
              errors.push(`Row ${rowNum}: Invalid Mobile Number for '${row.fullName}'. Must be 10 digits.`);
              return;
            }

            const registrationDate = new Date(row.registrationDate).toISOString().split('T')[0];
            const plantationDate = row.plantationDate ? new Date(row.plantationDate).toISOString().split('T')[0] : registrationDate;

            const regYear = new Date(registrationDate).getFullYear().toString().slice(-2);
            const key = `${row.district}${row.mandal}${row.village}${regYear}`;
            sequenceCounters[key] = (sequenceCounters[key] || 0) + 1;
            const seq = sequenceCounters[key].toString().padStart(3, '0');
            const farmerId = `${row.district}${row.mandal}${row.village}${regYear}${seq}`;
            const applicationId = `A${regYear}${row.district}${row.mandal}${row.village}${Math.floor(1000 + Math.random() * 9000)}`;
            const asoId = `SO${regYear}${row.district}${row.mandal}${Math.floor(100 + Math.random() * 900)}`;

            const newFarmer: Farmer = {
              id: farmerId,
              farmerId,
              applicationId,
              asoId,
              fullName: String(row.fullName || ''),
              fatherHusbandName: String(row.fatherHusbandName || ''),
              aadhaarNumber: String(row.aadhaarNumber),
              mobileNumber: String(row.mobileNumber),
              gender: row.gender || 'Male',
              address: String(row.address || ''),
              ppbRofrId: String(row.ppbRofrId || ''),
              photo: '',
              bankAccountNumber: String(row.bankAccountNumber || ''),
              ifscCode: String(row.ifscCode || ''),
              accountVerified: false,
              appliedExtent: Number(row.appliedExtent || 0),
              approvedExtent: Number(row.approvedExtent || row.appliedExtent || 0),
              numberOfPlants: Number(row.numberOfPlants || Math.round(Number(row.approvedExtent || row.appliedExtent || 0) * 57)),
              methodOfPlantation: row.methodOfPlantation || PlantationMethod.Square,
              plantType: row.plantType || PlantType.Imported,
              plantationDate: plantationDate,
              mlrdPlants: Number(row.mlrdPlants || 0),
              fullCostPlants: Number(row.fullCostPlants || 0),
              proposedYear: '2024-25',
              registrationDate: registrationDate,
              paymentUtrDd: '',
              status: row.status || FarmerStatus.Registered,
              district: String(row.district),
              mandal: String(row.mandal),
              village: String(row.village),
              syncedToSheets: false,
            };
            newFarmers.push(newFarmer);
          } catch (err) {
            errors.push(`Row ${rowNum}: Could not be processed. Error: ${(err as Error).message}`);
          }
        });

        if (newFarmers.length > 0) {
          if(window.confirm(`You are about to import ${newFarmers.length} new farmer records. Continue?`)){
              setFarmers(prev => [...prev, ...newFarmers]);
              setSyncQueue(prev => [...prev, ...newFarmers]);
              
              let report = `${newFarmers.length} farmers imported successfully.`;
              if (errors.length > 0) {
                  report += `\n\n${errors.length} rows were skipped due to errors:\n${errors.slice(0, 5).join('\n')}`;
                  if (errors.length > 5) report += '\n...and more. Check console for details.';
                  console.error("Import errors:", errors);
              }
              alert(report);
          }
        } else {
            alert(`No new farmers were imported. ${errors.length} rows had errors.\n\n${errors.slice(0,5).join('\n')}`);
            console.error("Import errors:", errors);
        }
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert("Failed to process the Excel file. It might be corrupted or in an unsupported format.");
      }
    };
    reader.readAsArrayBuffer(file);
    if(event.target) event.target.value = '';
  };
  
  const handleSyncToGoogleSheets = useCallback(async () => {
    if (selectedFarmerIds.length === 0) {
        alert("Please select at least one farmer to sync.");
        return;
    }
    if (!isOnline) {
        alert("You are currently offline. Please connect to the internet to sync.");
        return;
    }

    let url = webhookUrl;
    if(!url) {
      url = prompt("Please enter your Google Sheets Apps Script Webhook URL:") || '';
      setWebhookUrl(url);
    }
    if(!url){
        alert("Webhook URL is required for syncing.");
        return;
    }
    
    const farmersToSync = farmers.filter(f => selectedFarmerIds.includes(f.id) && !f.syncedToSheets);
    if(farmersToSync.length === 0){
        alert("All selected farmers are already in sync.");
        return;
    }

    if (!window.confirm(`You are about to sync ${farmersToSync.length} farmer record${farmersToSync.length === 1 ? '' : 's'} to Google Sheets. Proceed?`)) {
      return;
    }

    setSyncLoading(true);
    try {
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({farmers: farmersToSync}),
        });
        
        alert(`Successfully sent ${farmersToSync.length} records for sync!`);

        const syncedIds = new Set(farmersToSync.map(f => f.id));
        setFarmers(prev => prev.map(f => syncedIds.has(f.id) ? {...f, syncedToSheets: true} : f));
        setSelectedFarmerIds([]);

    } catch(error) {
        console.error("Error syncing to Google Sheets:", error);
        let errorMessage = "An unknown error occurred during sync.";
        
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            if (!navigator.onLine) {
                errorMessage = "Sync failed. You appear to be offline. Please check your internet connection.";
            } else {
                errorMessage = "Sync failed. Could not connect to the server. Please check your webhook URL, network connection, and ensure the server is accessible.";
            }
        } else if (error instanceof Error) {
            errorMessage = `Sync failed: ${error.message}. Please check the console for more details.`;
        }
        
        alert(errorMessage);
    } finally {
        setSyncLoading(false);
    }

  }, [webhookUrl, setWebhookUrl, farmers, setFarmers, selectedFarmerIds, isOnline]);
  
  if (!isAppLaunched) {
      return (
          <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
              <LandingPage onLaunch={() => setIsAppLaunched(true)} />
          </Suspense>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onRegister={handleRegisterClick} 
        onExport={handleExportToExcel}
        onExportCsv={handleExportToCsv}
        onImport={handleImportClick}
        onSync={handleSyncToGoogleSheets}
        onDeleteSelected={handleDeleteSelected}
        syncLoading={syncLoading}
        selectedCount={selectedFarmerIds.length}
        isOnline={isOnline}
        pendingSyncCount={syncQueue.length}
      />
      <main className="p-6">
        <FilterBar onFilterChange={setFilters} />
        <FarmerList 
            farmers={filteredFarmers} 
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
              onCancel={() => {
                  setShowForm(false);
                  setEditingFarmer(null);
              }} 
              initialData={editingFarmer}
              existingFarmers={farmers}
          />
        )}
      </Suspense>
      
      <input type="file" ref={importFileRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls" />

      {/* Suspense for PrintView. Fallback can be null as it's not visible to the user during load. */}
      <Suspense fallback={null}>
        {/* For PDF export - off-screen */}
        {pdfExportFarmer && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
            <div ref={pdfContainerRef}>
              <PrintView farmer={pdfExportFarmer} isForPdf={true} />
            </div>
          </div>
        )}

        {/* For regular printing */}
        <PrintView farmer={printingFarmer} />
      </Suspense>
    </div>
  );
};

export default App;
