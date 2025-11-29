

import React, { useState, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType } from '../types';
import { GEO_DATA } from '../data/geoData';
import { GoogleGenAI, Type } from '@google/genai';
import { getGeoName } from '../lib/utils';

// For CDN xlsx library
declare const XLSX: any;

interface BulkImportModalProps {
    onClose: () => void;
    onSubmit: (newFarmers: Farmer[]) => Promise<void>;
    existingFarmers: Farmer[];
}

// --- Internal Types ---
type NewRecord = Farmer & { tempIndex: number; rowNum: number; rawData: any; asoId?: string; primary_crop?: string; };
interface DuplicatePair {
    newRecord: NewRecord;
    existingRecord: Farmer;
    reason: string;
    decision: 'import' | 'skip';
}

// Create a reverse mapping for geo data for easier lookup
const geoNameMap = new Map<string, { districtCode: string; mandalCode?: string; villageCode?: string }>();
GEO_DATA.forEach(district => {
    geoNameMap.set(district.name.toLowerCase().trim(), { districtCode: district.code });
    district.mandals.forEach(mandal => {
        const mandalKey = `${district.name.toLowerCase().trim()}-${mandal.name.toLowerCase().trim()}`;
        geoNameMap.set(mandalKey, { districtCode: district.code, mandalCode: mandal.code });
        mandal.villages.forEach(village => {
            const villageKey = `${mandalKey}-${village.name.toLowerCase().trim()}`;
            geoNameMap.set(villageKey, { districtCode: district.code, mandalCode: mandal.code, villageCode: village.code });
        });
    });
});

type Step = 'upload' | 'review' | 'summary';

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onSubmit, existingFarmers }) => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for the new workflow
    const [processingMessage, setProcessingMessage] = useState('');
    const [allNewRecords, setAllNewRecords] = useState<NewRecord[]>([]);
    const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([]);
    const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);
    
    const farmersByVillage = useMemo(() => {
        const initialValue: Record<string, Farmer[]> = {};
        return existingFarmers.reduce((acc, farmer) => {
            const villageKey = `${farmer.district}-${farmer.mandal}-${farmer.village}`;
            if (!acc[villageKey]) acc[villageKey] = [];
            acc[villageKey].push(farmer);
            return acc;
        }, initialValue);
    }, [existingFarmers]);


    const handleFileChange = (selectedFile: File | null) => {
        if (selectedFile) {
            if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && !selectedFile.name.endsWith('.xlsx')) {
                setError('Invalid file type. Please upload a .xlsx file.');
                setFile(null);
            } else {
                setError(null);
                setFile(selectedFile);
            }
        }
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setProcessingMessage('Reading spreadsheet...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const validationErrors: string[] = [];
                let failedCount = 0;
                
                // --- Step 1: Validate and parse all rows ---
                const parsedRecords = rows.map((row, i): NewRecord | null => {
                    const rowNum = i + 2;
                    if (!row.fullName || !row.aadhaarNumber || !row.district || !row.mandal || !row.village) {
                        validationErrors.push(`Row ${rowNum}: Missing required fields (fullName, aadhaarNumber, district, mandal, village).`);
                        failedCount++;
                        return null;
                    }
                    if (!/^\d{12}$/.test(String(row.aadhaarNumber))) {
                         validationErrors.push(`Row ${rowNum}: Invalid Aadhaar for ${row.fullName} (must be 12 digits).`);
                         failedCount++;
                         return null;
                    }
                    const districtKey = String(row.district).trim().toLowerCase();
                    const mandalKey = `${districtKey}-${String(row.mandal).trim().toLowerCase()}`;
                    const villageKey = `${mandalKey}-${String(row.village).trim().toLowerCase()}`;
                    const villageInfo = geoNameMap.get(villageKey);
                    if (!villageInfo?.districtCode || !villageInfo?.mandalCode || !villageInfo?.villageCode) {
                        validationErrors.push(`Row ${rowNum}: Location not found for ${row.district} > ${row.mandal} > ${row.village}.`);
                        failedCount++;
                        return null;
                    }
                    
                    const { districtCode, mandalCode, villageCode } = villageInfo;
                    const registrationDate = new Date();
                    const now = registrationDate.toISOString();
                    const regYear = registrationDate.getFullYear().toString().slice(-2);
                    
                    const asoId = `SO${regYear}${districtCode}${mandalCode}${Math.floor(100 + Math.random() * 900)}`;

                    return {
                        tempIndex: i,
                        rowNum,
                        rawData: row,
                        id: '', 
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
                        approvedExtent: Number(row.approvedExtent) || 0,
                        appliedExtent: Number(row.appliedExtent) || 0,
                        numberOfPlants: Number(row.numberOfPlants) || 0,
                        methodOfPlantation: (Object.values(PlantationMethod).includes(row.methodOfPlantation) ? row.methodOfPlantation : PlantationMethod.Square) as PlantationMethod,
                        plantType: (Object.values(PlantType).includes(row.plantType) ? row.plantType : PlantType.Imported) as PlantType,
                        plantationDate: row.plantationDate ? new Date(row.plantationDate).toISOString().split('T')[0] : '',
                        // mlrdPlants and fullCostPlants removed as they are not in Farmer type
                        latitude: row.latitude ? parseFloat(row.latitude) : undefined,
                        longitude: row.longitude ? parseFloat(row.longitude) : undefined,
                        gov_application_id: String(row.gov_application_id || '').trim(),
                        gov_farmer_id: String(row.gov_farmer_id || '').trim(),
                        asoId,
                        proposedYear: '2024-25',
                        registrationDate: now.split('T')[0],
                        status: FarmerStatus.Registered,
                        district: districtCode,
                        mandal: mandalCode,
                        village: villageCode,
                        syncStatus: 'pending',
                        createdAt: now,
                        updatedAt: now,
                        tenantId: '', // Will be filled by parent
                        createdBy: '', // Placeholder, filled by parent/system
                        is_in_ne_region: false,
                        primary_crop: 'Oil Palm',
                        hap_id: '',
                    };
                }).filter((r): r is NewRecord => r !== null);
                
                setAllNewRecords(parsedRecords);

                // --- Step 3: Check for duplicates using AI ---
                setProcessingMessage('Checking for duplicates with AI...');
                
                if (!process.env.API_KEY) {
                    throw new Error("Gemini API key is not configured. An administrator must set this to enable duplicate detection.");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const responseSchema = {
                    type: Type.OBJECT, properties: {
                        duplicatePairs: {
                            type: Type.ARRAY, items: {
                                type: Type.OBJECT, properties: {
                                    newRecordIndex: { type: Type.INTEGER },
                                    existingFarmerId: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }, required: ['newRecordIndex', 'existingFarmerId', 'reason']
                            }
                        }
                    }
                };
                
                const newRecordsByVillage = parsedRecords.reduce((acc, f) => {
                    const key = `${f.district}-${f.mandal}-${f.village}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(f);
                    return acc;
                }, {} as Record<string, NewRecord[]>);

                const foundDuplicatePairs: DuplicatePair[] = [];

                for (const villageKey in newRecordsByVillage) {
                    const newRecs = newRecordsByVillage[villageKey];
                    const existingRecs = farmersByVillage[villageKey] || [];
                    if (existingRecs.length === 0) continue;

                    const prompt = `You are a data auditing expert. You will receive two lists of farmers for the same village: "newRecords" and "existingRecords". Your task is to identify potential duplicates where a record from "newRecords" matches a record from "existingRecords". A duplicate is likely if names are very similar, father's names are similar, etc. Return a JSON object matching the schema, containing a list of pairs. Each pair should contain one record from "newRecords" (identified by its temporary index) and one from "existingRecords" (identified by its hap_id).

                        newRecords: ${JSON.stringify(newRecs.map(f => ({ tempIndex: f.tempIndex, fullName: f.fullName, fatherHusbandName: f.fatherHusbandName, aadhaarLast4: f.aadhaarNumber.slice(-4) })))}
                        existingRecords: ${JSON.stringify(existingRecs.map(f => ({ hap_id: f.hap_id, fullName: f.fullName, fatherHusbandName: f.fatherHusbandName, aadhaarLast4: f.aadhaarNumber.slice(-4) })))}
                    `;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: { responseMimeType: 'application/json', responseSchema },
                    });
                    
                    const result = JSON.parse(response.text);
                    if (result.duplicatePairs) {
                        for (const pair of result.duplicatePairs) {
                            const newRecord = parsedRecords.find(r => r.tempIndex === pair.newRecordIndex);
                            const existingRecord = existingFarmers.find(f => f.hap_id === pair.existingFarmerId);
                            if (newRecord && existingRecord) {
                                foundDuplicatePairs.push({ newRecord, existingRecord, reason: pair.reason, decision: 'skip' });
                            }
                        }
                    }
                }
                
                if (foundDuplicatePairs.length > 0) {
                    setDuplicatePairs(foundDuplicatePairs);
                    setStep('review');
                } else {
                    await onSubmit(parsedRecords);
                    setImportSummary({ imported: parsedRecords.length, skipped: 0, failed: failedCount, errors: validationErrors });
                    setStep('summary');
                }

            } catch (err: any) {
                console.error("Error processing file:", err);
                setError(err.message || `An unexpected error occurred. Please check the file format and API key.`);
                setStep('upload');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    
    const handleDecisionChange = (index: number, decision: 'import' | 'skip') => {
        setDuplicatePairs(prev => prev.map((pair, i) => i === index ? { ...pair, decision } : pair));
    };

    const handleConfirmImport = async () => {
        const recordsToSkip = new Set(duplicatePairs.filter(p => p.decision === 'skip').map(p => p.newRecord.tempIndex));
        const finalRecordsToImport = allNewRecords.filter(r => !recordsToSkip.has(r.tempIndex));

        setIsProcessing(true);
        await onSubmit(finalRecordsToImport);
        setIsProcessing(false);

        const summaryErrors = allNewRecords.filter(r => !finalRecordsToImport.includes(r)).map(r => `Row ${r.rowNum}: Skipped due to potential duplicate of ${duplicatePairs.find(p => p.newRecord.tempIndex === r.tempIndex)?.existingRecord.fullName}.`);
        
        setImportSummary({
            imported: finalRecordsToImport.length,
            skipped: recordsToSkip.size,
            failed: (importSummary?.failed || 0),
            errors: (importSummary?.errors || []).concat(summaryErrors)
        });
        setStep('summary');
    };
    
    const resetState = () => {
        setStep('upload');
        setFile(null);
        setError(null);
        setAllNewRecords([]);
        setDuplicatePairs([]);
        setImportSummary(null);
    };

    const handleDownloadTemplate = () => {
        const headers = ['fullName', 'fatherHusbandName', 'aadhaarNumber', 'mobileNumber', 'gender', 'address', 'ppbRofrId', 'bankAccountNumber', 'ifscCode', 'district', 'mandal', 'village'];
        const exampleRow = ['Jane Doe', 'John Doe', '123456789012', '9876543210', 'Female', '123 Main St, Anytown', 'PPB123', '987654321098', 'SBIN0001234', 'Hanmakonda', 'Hanamkonda', 'Hanamkonda'];
        const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Farmer Template');
        XLSX.writeFile(wb, 'Hapsara_Farmer_Import_Template.xlsx');
    };

    // --- UI Components ---
    const UploadStep = () => (
        <>
            <div className="p-4 bg-blue-900/50 border border-blue-700/50 rounded-lg text-sm text-blue-300 mb-6">
                <strong>Coming Soon:</strong> Bulk import for farmers with multiple plots is not yet supported. The current template only imports basic farmer details. Please add plots manually after importing.
            </div>
            <div onDragEnter={e => {e.preventDefault(); e.stopPropagation(); setIsDragging(true);}} onDragLeave={e => {e.preventDefault(); e.stopPropagation(); setIsDragging(false);}} onDragOver={e => {e.preventDefault(); e.stopPropagation();}} onDrop={e => {e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);}} className={`p-10 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-green-400 bg-gray-700' : 'border-gray-500 hover:border-green-500'}`}>
                <input type="file" id="bulk-import-file-input" className="hidden" accept=".xlsx" onChange={e => handleFileChange(e.target.files?.[0])} />
                <div className="flex flex-col items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <p className="mt-4 text-gray-300">Drag & drop your .xlsx file here or <label htmlFor="bulk-import-file-input" className="font-semibold text-green-400 cursor-pointer hover:underline">click to browse.</label></p>
                    {file && <p className="mt-2 text-sm font-mono bg-gray-900 px-2 py-1 rounded">{file.name}</p>}
                </div>
            </div>
            <div className="text-center mt-4">
                <button onClick={handleDownloadTemplate} className="text-green-400 hover:text-green-300 font-semibold transition inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Download Template</button>
            </div>
            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
        </>
    );
    
    const ReviewStep = () => (
        <div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Potential Duplicates Found</h3>
            <p className="text-sm text-gray-400 mb-4">AI analysis has flagged the following records from your file as potential duplicates of existing farmers. Please review each one.</p>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {duplicatePairs.map((pair, index) => (
                    <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <div className="p-2 bg-yellow-900/50 text-yellow-300 text-sm rounded-md mb-3 border border-yellow-700/50"><strong>AI Reason:</strong> {pair.reason}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><h4 className="font-semibold text-gray-300 border-b border-gray-600 pb-1 mb-2">New Record (from file)</h4><div className="text-sm space-y-1">{Object.entries(pair.newRecord.rawData).map(([key, val]) => <div key={key}><strong className="text-gray-400">{key}:</strong> {String(val)}</div>)}</div></div>
                            <div><h4 className="font-semibold text-green-300 border-b border-gray-600 pb-1 mb-2">Existing Farmer</h4><div className="text-sm space-y-1"><div><strong className="text-gray-400">fullName:</strong> {pair.existingRecord.fullName}</div><div><strong className="text-gray-400">fatherHusbandName:</strong> {pair.existingRecord.fatherHusbandName}</div><div><strong className="text-gray-400">mobileNumber:</strong> {pair.existingRecord.mobileNumber}</div><div><strong className="text-gray-400">hap_id:</strong> {pair.existingRecord.hap_id}</div></div></div>
                        </div>
                        <div className="mt-4 flex justify-end items-center gap-4">
                            <span className="text-sm font-semibold text-gray-300">Action:</span>
                            <button onClick={() => handleDecisionChange(index, 'import')} className={`px-3 py-1 text-sm rounded ${pair.decision === 'import' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-50'}`}>Import Anyway</button>
                            <button onClick={() => handleDecisionChange(index, 'skip')} className={`px-3 py-1 text-sm rounded ${pair.decision === 'skip' ? 'bg-red-600 text-white' : 'bg-gray-600 hover:bg-gray-50'}`}>Skip Record</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const SummaryStep = () => (
        <div>
            <h3 className="text-lg font-semibold text-center mb-4">Import Complete</h3>
            {importSummary && <div className="flex justify-around text-center mb-6">
                <div><p className="text-3xl font-bold text-green-400">{importSummary.imported}</p><p className="text-gray-400">Imported</p></div>
                <div><p className="text-3xl font-bold text-yellow-400">{importSummary.skipped}</p><p className="text-gray-400">Skipped (Duplicates)</p></div>
                <div><p className="text-3xl font-bold text-red-400">{importSummary.failed}</p><p className="text-gray-400">Failed (Validation)</p></div>
            </div>}
            {importSummary?.errors && importSummary.errors.length > 0 && (
                <div className="mt-4"><h4 className="font-semibold mb-2">Error & Skipped Details:</h4>
                    <div className="bg-gray-900 p-3 rounded-md max-h-40 overflow-y-auto text-sm">
                        <ul className="list-disc list-inside space-y-1">{importSummary.errors.map((err, i) => <li key={i} className="text-red-400">{err}</li>)}</ul>
                    </div>
                </div>
            )}
            <div className="text-center mt-6"><button onClick={resetState} className="text-green-400 hover:underline font-semibold">Import another file</button></div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" aria-modal="true" role="dialog">
            <div className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-2xl transform transition-all">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">Bulk Import Farmers (Step {step === 'upload' ? 1 : step === 'review' ? 2 : 3} of 3)</h2></div>
                <div className="p-8 min-h-[300px]">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div><p>{processingMessage}</p></div>
                    ) : (
                        <>
                            {step === 'upload' && <UploadStep />}
                            {step === 'review' && <ReviewStep />}
                            {step === 'summary' && <SummaryStep />}
                        </>
                    )}
                </div>
                <div className="bg-gray-900 p-4 flex justify-end gap-4 rounded-b-lg">
                    {step === 'summary' ? (
                         <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-50 transition">Close</button>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} disabled={isProcessing} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-50 transition">Cancel</button>
                            {step === 'upload' && <button type="button" onClick={processFile} disabled={!file || isProcessing} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">Process File</button>}
                            {step === 'review' && <button type="button" onClick={handleConfirmImport} disabled={isProcessing} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">Confirm Import</button>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;