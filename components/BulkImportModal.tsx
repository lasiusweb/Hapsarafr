import React, { useState } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType } from '../types';
import { GEO_DATA } from '../data/geoData';

// For CDN xlsx library
declare const XLSX: any;

interface BulkImportModalProps {
    onClose: () => void;
    onSubmit: (newFarmers: Farmer[]) => Promise<void>;
    existingFarmers: Farmer[];
}

// Create a reverse mapping for geo data for easier lookup and case-insensitivity
const geoNameMap = new Map<string, { districtCode: string; mandalCode?: string; villageCode?: string }>();
GEO_DATA.forEach(district => {
    geoNameMap.set(district.name.toLowerCase(), { districtCode: district.code });
    district.mandals.forEach(mandal => {
        const mandalKey = `${district.name.toLowerCase()}-${mandal.name.toLowerCase()}`;
        geoNameMap.set(mandalKey, { districtCode: district.code, mandalCode: mandal.code });
        mandal.villages.forEach(village => {
            const villageKey = `${mandalKey}-${village.name.toLowerCase()}`;
            geoNameMap.set(villageKey, { districtCode: district.code, mandalCode: mandal.code, villageCode: village.code });
        });
    });
});


const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onSubmit, existingFarmers }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingResult, setProcessingResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && !selectedFile.name.endsWith('.xlsx')) {
                setError('Invalid file type. Please upload a .xlsx file.');
                setFile(null);
            } else {
                setError(null);
                setFile(selectedFile);
                setProcessingResult(null);
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    const handleBrowseClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileChange(e.target.files[0]);
        }
        // Reset the input value to allow re-uploading the same file
        e.target.value = '';
    };
    
    const handleDownloadTemplate = () => {
        const headers = [
            'fullName', 'fatherHusbandName', 'aadhaarNumber', 'mobileNumber', 'gender',
            'address', 'ppbRofrId', 'bankAccountNumber', 'ifscCode', 'appliedExtent',
            'district', 'mandal', 'village'
        ];
        const exampleRow = [
            'Jane Doe', 'John Doe', '123456789012', '9876543210', 'Female',
            '123 Main St, Anytown', 'PPB123', '987654321098', 'SBIN0001234', 5,
            'Hanmakonda', 'Hanamkonda', 'Hanamkonda'
        ];
        
        const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Farmer Template');
        XLSX.writeFile(wb, 'Hapsara_Farmer_Import_Template.xlsx');
    };

    const processFile = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        setProcessingResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const newFarmers: Farmer[] = [];
                const errors: string[] = [];
                let successfulCount = 0;
                let failedCount = 0;

                const allKnownFarmers = [...existingFarmers];

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const rowNum = i + 2;

                    if (!row.fullName || !row.aadhaarNumber || !row.district || !row.mandal || !row.village) {
                        errors.push(`Row ${rowNum}: Missing required fields (fullName, aadhaarNumber, district, mandal, village).`);
                        failedCount++;
                        continue;
                    }

                    if (!/^\d{12}$/.test(String(row.aadhaarNumber))) {
                         errors.push(`Row ${rowNum}: Invalid Aadhaar number for ${row.fullName} (must be 12 digits).`);
                         failedCount++;
                         continue;
                    }
                    
                    const districtKey = String(row.district).trim().toLowerCase();
                    const mandalKey = `${districtKey}-${String(row.mandal).trim().toLowerCase()}`;
                    const villageKey = `${mandalKey}-${String(row.village).trim().toLowerCase()}`;
                    
                    const villageInfo = geoNameMap.get(villageKey);

                    if (!villageInfo?.districtCode || !villageInfo?.mandalCode || !villageInfo?.villageCode) {
                        errors.push(`Row ${rowNum}: Could not find a matching location for ${row.district} > ${row.mandal} > ${row.village}.`);
                        failedCount++;
                        continue;
                    }
                    
                    const { districtCode, mandalCode, villageCode } = villageInfo;

                    const registrationDate = new Date();
                    const regYear = registrationDate.getFullYear().toString().slice(-2);
                    
                    const farmersInVillage = allKnownFarmers.filter(f => 
                        f.village === villageCode && f.mandal === mandalCode && f.district === districtCode
                    );
                    
                    const seq = (farmersInVillage.length + 1).toString().padStart(3, '0');
                    const farmerId = `${districtCode}${mandalCode}${villageCode}${seq}`;
                    
                    const randomAppIdSuffix = Math.floor(1000 + Math.random() * 9000);
                    const applicationId = `A${regYear}${districtCode}${mandalCode}${villageCode}${randomAppIdSuffix}`;
                    
                    const asoId = `SO${regYear}${districtCode}${mandalCode}${Math.floor(100 + Math.random() * 900)}`;

                    const farmer: Farmer = {
                        id: farmerId,
                        farmerId: farmerId,
                        applicationId,
                        asoId,
                        fullName: String(row.fullName).trim(),
                        fatherHusbandName: String(row.fatherHusbandName || '').trim(),
                        aadhaarNumber: String(row.aadhaarNumber).trim(),
                        mobileNumber: String(row.mobileNumber || '').trim(),
                        gender: ['Male', 'Female', 'Other'].includes(row.gender) ? row.gender : 'Male',
                        address: String(row.address || '').trim(),
                        ppbRofrId: String(row.ppbRofrId || '').trim(),
                        photo: '',
                        bankAccountNumber: String(row.bankAccountNumber || '').trim(),
                        ifscCode: String(row.ifscCode || '').trim(),
                        accountVerified: false,
                        appliedExtent: Number(row.appliedExtent) || 0,
                        approvedExtent: 0,
                        numberOfPlants: 0,
                        methodOfPlantation: PlantationMethod.Square,
                        plantType: PlantType.Imported,
                        plantationDate: '',
                        mlrdPlants: 0,
                        fullCostPlants: 0,
                        proposedYear: '2024-25',
                        registrationDate: registrationDate.toISOString().split('T')[0],
                        paymentUtrDd: '',
                        status: FarmerStatus.Registered,
                        district: districtCode,
                        mandal: mandalCode,
                        village: villageCode,
                        syncStatus: 'pending',
                    };
                    
                    newFarmers.push(farmer);
                    allKnownFarmers.push(farmer);
                    successfulCount++;
                }
                
                if (newFarmers.length > 0) {
                    await onSubmit(newFarmers);
                }
                
                setProcessingResult({ success: successfulCount, failed: failedCount, errors });

            } catch (err) {
                console.error("Error processing file:", err);
                setError(`An unexpected error occurred. Please check the file format and ensure it matches the template.`);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const fileInputId = 'bulk-import-file-input';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-2xl transform transition-all">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Bulk Import Farmers</h2>
                </div>
                <div className="p-8">
                    {processingResult ? (
                        <div>
                             <h3 className="text-lg font-semibold text-center mb-4">Import Complete</h3>
                            <div className="flex justify-around text-center mb-6">
                                <div>
                                    <p className="text-3xl font-bold text-green-400">{processingResult.success}</p>
                                    <p className="text-gray-400">Successfully Imported</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-red-400">{processingResult.failed}</p>
                                    <p className="text-gray-400">Failed Records</p>
                                </div>
                            </div>
                            {processingResult.errors.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Error Details:</h4>
                                    <div className="bg-gray-900 p-3 rounded-md max-h-40 overflow-y-auto text-sm">
                                        <ul className="list-disc list-inside space-y-1">
                                            {processingResult.errors.slice(0, 10).map((err, i) => (
                                                <li key={i} className="text-red-400">{err}</li>
                                            ))}
                                            {processingResult.errors.length > 10 && <li>...and {processingResult.errors.length - 10} more errors.</li>}
                                        </ul>
                                    </div>
                                </div>
                            )}
                            <div className="text-center mt-6">
                                <button onClick={() => { setFile(null); setProcessingResult(null); setError(null); }} className="text-green-400 hover:underline font-semibold">
                                    Import another file
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                             <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`p-10 border-2 border-dashed rounded-lg text-center transition-colors
                                    ${isDragging ? 'border-green-400 bg-gray-700' : 'border-gray-500 hover:border-green-500'}`
                                }
                            >
                                <input type="file" id={fileInputId} className="hidden" accept=".xlsx" onChange={handleBrowseClick} />
                                <div className="flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <p className="mt-4 text-gray-300">
                                        Drag & drop your .xlsx file here or{' '}
                                        <label htmlFor={fileInputId} className="font-semibold text-green-400 cursor-pointer hover:underline">
                                            click to browse.
                                        </label>
                                    </p>
                                    {file && <p className="mt-2 text-sm font-mono bg-gray-900 px-2 py-1 rounded">{file.name}</p>}
                                </div>
                            </div>
                            <div className="text-center mt-4">
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="text-green-400 hover:text-green-300 font-semibold transition inline-flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Download Template
                                </button>
                            </div>
                            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
                        </>
                    )}
                </div>
                <div className="bg-gray-900 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition">
                        {processingResult ? 'Close' : 'Cancel'}
                    </button>
                    {!processingResult && (
                         <button
                            type="button"
                            onClick={processFile}
                            disabled={!file || isProcessing}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Process File'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;