import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType, User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import AiReviewModal from './AiReviewModal';
import { getGeoName } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { useDatabase } from '../DatabaseContext';
import { DistrictModel, MandalModel, VillageModel, TerritoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
// @ts-ignore
import { useObservables } from '@nozbe/watermelondb/react';
import { useQuery } from '../hooks/useQuery';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';

interface RegistrationFormProps {
    onSubmit: (farmer: Farmer, photoFile?: File) => Promise<void>;
    onCancel: () => void;
    existingFarmers: Farmer[];
    mode?: 'create' | 'edit';
    existingFarmer?: Farmer | null;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    currentUser: User;
}

const initialFormData: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> & any = {
    fullName: '',
    fatherHusbandName: '',
    aadhaarNumber: '',
    mobileNumber: '',
    gender: 'Male',
    address: '',
    ppbRofrId: '',
    photo: '',
    bankAccountNumber: '',
    ifscCode: '',
    accountVerified: false,
    appliedExtent: 0,
    approvedExtent: 0,
    numberOfPlants: 0,
    methodOfPlantation: PlantationMethod.Square,
    plantType: PlantType.Imported,
    plantationDate: '',
    mlrdPlants: 0,
    fullCostPlants: 0,
    latitude: undefined,
    longitude: undefined,
    proposedYear: '2024-25',
    registrationDate: new Date().toISOString().split('T')[0],
    asoId: '',
    paymentUtrDd: '',
    status: FarmerStatus.Registered,
    district: '',
    mandal: '',
    village: '',
    syncStatus: 'pending',
    tenantId: '', // Added for multi-tenancy
    is_in_ne_region: false,
    primary_crop: 'Oil Palm',
    hap_id: '',
    gov_application_id: '',
    gov_farmer_id: '',
};

const DRAFT_STORAGE_KEY = 'hapsara-farmer-registration-draft';
const PLANT_DENSITY_PER_ACRE = 57; // As per standard guidelines for oil palm

const STEPS = [
    { id: 1, name: 'Personal Details' },
    { id: 2, name: 'Geographic Details' },
    { id: 3, name: 'Bank Details' },
    { id: 4, name: 'Land & Plantation' },
    { id: 5, name: 'Review & Submit' },
];

const FIELDS_BY_STEP: (keyof Farmer | string)[][] = [
    [], // 1-based index
    ['fullName', 'fatherHusbandName', 'address', 'aadhaarNumber', 'mobileNumber', 'registrationDate'],
    ['district', 'mandal', 'village'],
    ['bankAccountNumber', 'ifscCode'],
    ['appliedExtent', 'approvedExtent', 'numberOfPlants', 'mlrdPlants'],
];

const runValidationForStep = (step: number, data: any): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
        if (!data.fullName.trim()) newErrors.fullName = "Full Name is required.";
        if (!data.fatherHusbandName.trim()) newErrors.fatherHusbandName = "Father/Husband Name is required.";
        if (!data.address.trim()) newErrors.address = "Address is required.";
        if (data.aadhaarNumber.trim() && !/^\d{12}$/.test(data.aadhaarNumber)) newErrors.aadhaarNumber = "If provided, Aadhaar must be 12 digits.";
        if (!/^[6-9]\d{9}$/.test(data.mobileNumber)) newErrors.mobileNumber = "Mobile number must be 10 digits and start with 6-9.";
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (!data.registrationDate) newErrors.registrationDate = "Registration date is required.";
        else { const regDate = new Date(data.registrationDate); if (isNaN(regDate.getTime())) newErrors.registrationDate = "Please enter a valid registration date."; else if (regDate > today) newErrors.registrationDate = "Registration date cannot be a future date."; }
    }
    if (step === 2) {
        if (!data.district) newErrors.district = 'District is required.';
        if (!data.mandal) newErrors.mandal = 'Mandal is required.';
        if (!data.village) newErrors.village = 'Village is required.';
    }
    if (step === 3) {
        if (!data.bankAccountNumber.trim()) newErrors.bankAccountNumber = "Bank Account Number is required.";
        if (!data.ifscCode.trim()) newErrors.ifscCode = "IFSC Code is required.";
        else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())) newErrors.ifscCode = "Invalid IFSC code format (e.g., XXXX0000000).";
    }
    if (step === 4) {
        const appliedExtent = Number(data.appliedExtent); if (appliedExtent > 0) { if (appliedExtent < 0.5) newErrors.appliedExtent = "Applied extent must be at least 0.5 acres."; if (appliedExtent > 100) newErrors.appliedExtent = "Applied extent cannot exceed 100 acres."; }
        const approvedExtent = Number(data.approvedExtent); if (approvedExtent > 0) { if (approvedExtent < 0.5) newErrors.approvedExtent = "Approved extent must be at least 0.5 acres."; if (approvedExtent > 100) newErrors.approvedExtent = "Approved extent cannot exceed 100 acres."; }
        if (approvedExtent > 0 && appliedExtent > 0 && approvedExtent > appliedExtent) newErrors.approvedExtent = "Approved extent cannot be greater than applied extent.";
        
        const numberOfPlants = Number(data.numberOfPlants) || 0;
        if (numberOfPlants > 0) {
            if (numberOfPlants < 20) newErrors.numberOfPlants = "Number of plants must be at least 20 for a viable plantation."; 
            else if (numberOfPlants > 10000) newErrors.numberOfPlants = "Number of plants cannot exceed 10,000.";
            
            if (approvedExtent > 0) {
                const expectedPlants = approvedExtent * PLANT_DENSITY_PER_ACRE; 
                const tolerance = expectedPlants * 0.1; 
                if (numberOfPlants < expectedPlants - tolerance || numberOfPlants > expectedPlants + tolerance) newErrors.numberOfPlants = `Number of plants seems incorrect for ${approvedExtent} acres. It should be around ${Math.round(expectedPlants)}.`; 
            }
            
            const mlrdPlants = Number(data.mlrdPlants) || 0;
            const fullCostPlants = Number(data.fullCostPlants) || 0;
            if (mlrdPlants + fullCostPlants > numberOfPlants) {
                newErrors.mlrdPlants = "Sum of MLRD and Full Cost plants cannot exceed total plants.";
            }
        }
    }
    return newErrors;
};


type FormRowProps = { children?: React.ReactNode };
const FormRow = ({ children }: FormRowProps) => <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">{children}</div>;

type FormFieldProps = { children?: React.ReactNode };
const FormField = ({ children }: FormFieldProps) => <div className="md:col-span-2">{children}</div>;

export default function RegistrationForm({ onSubmit, onCancel, existingFarmers, mode = 'create', existingFarmer = null, setNotification, currentUser }: RegistrationFormProps) {
    const database = useDatabase();
    const [formData, setFormData] = useState<any>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [preparedFarmerData, setPreparedFarmerData] = useState<any | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isCapturingLocation, setIsCapturingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showAiReview, setShowAiReview] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    
    const debouncedFormData = useDebounce(formData, 1000);

    // --- Dynamic Geo Data ---
    const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const claimedTerritories = useQuery(useMemo(() => database.get<TerritoryModel>('territories').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));
    
    const [selectedDistrict, setSelectedDistrict] = useState<DistrictModel | null>(null);
    const [selectedMandal, setSelectedMandal] = useState<MandalModel | null>(null);

    const mandalsQuery = useMemo(() => {
        if (!selectedDistrict) return null;
        return database.get<MandalModel>('mandals').query(Q.where('district_id', selectedDistrict.id), Q.sortBy('name'));
    }, [database, selectedDistrict]);
    const mandals = useQuery(mandalsQuery || database.get<MandalModel>('mandals').query(Q.where('id', 'null')));

    const villagesQuery = useMemo(() => {
        if (!selectedMandal) return null;
        return database.get<VillageModel>('villages').query(Q.where('mandal_id', selectedMandal.id), Q.sortBy('name'));
    }, [database, selectedMandal]);
    const villages = useQuery(villagesQuery || database.get<VillageModel>('villages').query(Q.where('id', 'null')));


    useEffect(() => {
        if (mode === 'edit' && existingFarmer) {
            const formStateFromFarmer = { ...initialFormData, ...existingFarmer };
            setFormData(formStateFromFarmer);
            if (existingFarmer.photo) {
                setPhotoPreview(existingFarmer.photo);
            }
            // Pre-populate dynamic geo selections for edit mode
            const initialDistrict = districts.find(d => d.code === existingFarmer.district);
            if (initialDistrict) setSelectedDistrict(initialDistrict);

        }
    }, [mode, existingFarmer, districts]);

     // Effect to set initial mandal for edit mode once mandals are loaded
    useEffect(() => {
        if(mode === 'edit' && existingFarmer && mandals.length > 0) {
            const initialMandal = mandals.find(m => m.code === existingFarmer.mandal);
            if(initialMandal) setSelectedMandal(initialMandal);
        }
    }, [mode, existingFarmer, mandals]);
    
    const handleDismissError = (fieldName: keyof typeof errors) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
        });
    };
    
    const InputError: React.FC<{ message?: string; onDismiss: () => void; }> = ({ message, onDismiss }) => {
        if (!message) return null;
        return (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-sm animate-fade-in-down" role="alert">
                <div className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{message}</span>
                </div>
                <button type="button" onClick={onDismiss} className="p-1 rounded-full hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Dismiss error">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        );
    };

    useEffect(() => {
        if (mode === 'edit') return;
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                if (JSON.stringify(draftData) !== JSON.stringify(initialFormData)) {
                     setHasDraft(true);
                }
            } catch (e) {
                console.error("Failed to parse draft", e);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'edit' || hasDraft) return;
        const isInitial = JSON.stringify(debouncedFormData) === JSON.stringify(initialFormData);
        if (!isInitial) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(debouncedFormData));
        } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }, [debouncedFormData, hasDraft, mode]);

    const handleGeoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'district') {
            const district = districts.find(d => d.code === value) || null;
            setSelectedDistrict(district);
            setSelectedMandal(null);
            setFormData(prev => ({ ...prev, mandal: '', village: '' }));
        }
        if (name === 'mandal') {
            const mandal = mandals.find(m => m.code === value) || null;
            setSelectedMandal(mandal);
            setFormData(prev => ({ ...prev, village: '' }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

        if (type === 'number' && name in ['latitude', 'longitude']) {
             setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
        } else {
             setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { setErrors(prev => ({...prev, photo: 'File size should not exceed 2MB'})); return; }
            if(!['image/jpeg', 'image/png'].includes(file.type)){ setErrors(prev => ({...prev, photo: 'Only JPG/PNG files are allowed'})); return; }
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPhotoPreview(base64String);
                setFormData(prev => ({ ...prev, photo: '' }));
                setErrors(prev => { const newErrors = {...prev}; delete newErrors.photo; return newErrors; });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearPhoto = () => {
        setFormData(prev => ({ ...prev, photo: '' }));
        setPhotoPreview(null);
        setPhotoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const handleCaptureLocation = () => {
        if (!navigator.geolocation) { setLocationError("Geolocation is not supported by this browser."); return; }
        setIsCapturingLocation(true);
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
                setIsCapturingLocation(false);
            },
            (error) => {
                let msg = "An unknown error occurred while getting location.";
                if(error.code === error.PERMISSION_DENIED) msg = "Permission to access location was denied.";
                if(error.code === error.POSITION_UNAVAILABLE) msg = "Location information is unavailable.";
                if(error.code === error.TIMEOUT) msg = "The request to get user location timed out.";
                setLocationError(msg);
                setIsCapturingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const validateStep = (step: number) => {
        const stepErrors = runValidationForStep(step, formData);
        const hasErrors = Object.keys(stepErrors).length > 0;
    
        if (hasErrors) {
            setErrors(prev => ({ ...prev, ...stepErrors }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                FIELDS_BY_STEP[step].forEach(field => delete newErrors[field as string]);
                return newErrors;
            });
        }
        
        return !hasErrors;
    };


    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < STEPS.length) {
                setCurrentStep(prev => prev + 1);
            }
        }
    };
    const handlePrevious = () => setCurrentStep(prev => Math.max(1, prev - 1));

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();

        const allErrors = [1, 2, 3, 4].reduce((acc, step) => {
            return { ...acc, ...runValidationForStep(step, formData) };
        }, {});

        setErrors(allErrors);

        if (Object.keys(allErrors).length === 0) {
            const now = new Date().toISOString();
            let farmerData: any;
            const regYear = new Date(formData.registrationDate).getFullYear().toString().slice(-2);
            const asoId = `SO${regYear}${formData.district}${formData.mandal}${Math.floor(100 + Math.random() * 900)}`;

            if (mode === 'create') {
                farmerData = { ...formData, id: '', asoId, createdAt: now, updatedAt: now, createdBy: currentUser.id, tenantId: currentUser.tenantId };
            } else {
                farmerData = { ...existingFarmer!, ...formData, updatedAt: now, updatedBy: currentUser.id };
            }
            setPreparedFarmerData(farmerData);
        } else {
            // Find the first step with an error and navigate to it
            for (let i = 1; i <= 4; i++) {
                if (FIELDS_BY_STEP[i].some(field => allErrors[field as string])) {
                    setCurrentStep(i);
                    break;
                }
            }
        }
    };
    
    const handleConfirmSubmit = async () => {
        if (preparedFarmerData) {
            setIsSubmitting(true);
            try {
                await onSubmit(preparedFarmerData, photoFile);
                if (mode === 'create') localStorage.removeItem(DRAFT_STORAGE_KEY);
                setShowSuccess(true);
            } catch (error) {
                console.error("Submission failed:", error);
                setNotification({ message: 'An error occurred while saving the farmer. Please try again.', type: 'error' });
                setPreparedFarmerData(null);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCancel = () => setShowCancelConfirmation(true);
    const handleConfirmCancel = () => {
        if (mode === 'create') localStorage.removeItem(DRAFT_STORAGE_KEY);
        setShowCancelConfirmation(false);
        onCancel();
    };
    const handleAbortCancel = () => setShowCancelConfirmation(false);

    const handleRestoreDraft = () => {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                setFormData(draftData);
                if (draftData.photo) setPhotoPreview(draftData.photo);
            } catch (e) { console.error("Failed to parse draft for restore", e); }
        }
        setHasDraft(false);
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setHasDraft(false);
    };

    const handleRegisterAnother = () => {
        setFormData(initialFormData);
        setPhotoPreview(null);
        setPhotoFile(null);
        setErrors({});
        setShowSuccess(false);
        setPreparedFarmerData(null);
        setCurrentStep(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const getErrorClass = (fieldName: string) => errors[fieldName] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

    const ProgressBar = ({ currentStep }: { currentStep: number }) => (
        <nav aria-label="Progress">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {STEPS.map((step, index) => {
                    const stepNumber = index + 1;
                    const status = stepNumber < currentStep ? 'complete' : stepNumber === currentStep ? 'current' : 'upcoming';
                    const canNavigate = stepNumber < currentStep;
                    
                    const content = (
                        <>
                            <span className={`text-xs font-semibold uppercase tracking-wide ${status === 'upcoming' ? 'text-gray-500' : 'text-green-600'}`}>Step {stepNumber}</span>
                            <span className="text-sm font-medium">{step.name}</span>
                        </>
                    );
                    
                    const commonClasses = `group flex flex-col py-2 pl-4 md:pl-0 md:pt-4 md:pb-0 md:border-l-0 border-l-4`;
                    const statusClasses = {
                        complete: 'border-green-600 hover:border-green-800 md:border-t-4',
                        current: 'border-green-600 md:border-t-4',
                        upcoming: 'border-gray-200 md:border-t-4'
                    };

                    return (
                        <li key={step.name} className="md:flex-1">
                            <button type="button" onClick={() => canNavigate && setCurrentStep(stepNumber)} disabled={!canNavigate} className={`${commonClasses} ${statusClasses[status]} w-full text-left`}>
                                {content}
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );

    const ReviewStep = () => {
        if (!preparedFarmerData) return null;
    
        const DetailItem: React.FC<{ label: string, value?: React.ReactNode }> = ({ label, value }) => {
            if (value === null || value === undefined || value === '' || (typeof value === 'number' && value === 0)) return null;
            return (
                <div className="flex justify-between border-b py-2 text-sm">
                    <span className="font-semibold text-gray-600">{label}:</span>
                    <span className="text-gray-900 text-right font-medium">{String(value)}</span>
                </div>
            );
        };
    
        return (
            <div>
                <h3 className="text-lg font-semibold text-green-700 mb-4">Review Details</h3>
                <p className="text-gray-600 mb-6">Please review all the information below before saving.</p>
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4">
                    
                    {/* Personal Details */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Personal Details</h4>
                        <DetailItem label="Full Name" value={preparedFarmerData.fullName} />
                        <DetailItem label="Father/Husband Name" value={preparedFarmerData.fatherHusbandName} />
                        <DetailItem label="Gender" value={preparedFarmerData.gender} />
                        <DetailItem label="Mobile Number" value={preparedFarmerData.mobileNumber} />
                        <DetailItem label="Aadhaar Number" value={preparedFarmerData.aadhaarNumber ? `**** **** ${preparedFarmerData.aadhaarNumber.slice(-4)}` : 'N/A'} />
                        <DetailItem label="Address" value={preparedFarmerData.address} />
                        <DetailItem label="Registration Date" value={new Date(preparedFarmerData.registrationDate).toLocaleDateString()} />
                    </div>
                    
                    {/* Geographic Details */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Geographic Details</h4>
                        <DetailItem label="District" value={getGeoName('district', preparedFarmerData)} />
                        <DetailItem label="Mandal" value={getGeoName('mandal', preparedFarmerData)} />
                        <DetailItem label="Village" value={getGeoName('village', preparedFarmerData)} />
                        <DetailItem label="NE Region Farmer" value={preparedFarmerData.is_in_ne_region ? 'Yes' : 'No'} />
                    </div>
    
                    {/* Bank Details */}
                     <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Bank Details</h4>
                        <DetailItem label="Bank Account No." value={preparedFarmerData.bankAccountNumber ? `...${preparedFarmerData.bankAccountNumber.slice(-4)}` : 'N/A'} />
                        <DetailItem label="IFSC Code" value={preparedFarmerData.ifscCode} />
                        <DetailItem label="Account Verified" value={preparedFarmerData.accountVerified ? 'Yes' : 'No'} />
                    </div>
                    
                    {/* Land & Plantation */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Land & Plantation Details</h4>
                        <DetailItem label="Primary Crop" value={preparedFarmerData.primary_crop} />
                        <DetailItem label="Applied Extent (Acres)" value={preparedFarmerData.appliedExtent} />
                        <DetailItem label="Approved Extent (Acres)" value={preparedFarmerData.approvedExtent} />
                        <DetailItem label="No. of Plants" value={preparedFarmerData.numberOfPlants} />
                        <DetailItem label="MLRD Plants" value={preparedFarmerData.mlrdPlants} />
                        <DetailItem label="Full Cost Plants" value={preparedFarmerData.fullCostPlants} />
                        <DetailItem label="Plantation Method" value={preparedFarmerData.methodOfPlantation} />
                        <DetailItem label="Plant Type" value={preparedFarmerData.plantType} />
                        <DetailItem label="Plantation Date" value={preparedFarmerData.plantationDate ? new Date(preparedFarmerData.plantationDate).toLocaleDateString() : 'Not Set'} />
                        <DetailItem label="Latitude" value={preparedFarmerData.latitude} />
                        <DetailItem label="Longitude" value={preparedFarmerData.longitude} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowAiReview(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold flex items-center gap-2"
                        title="Use AI to check the form for potential errors or inconsistencies."
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                        Review with AI
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            {!showSuccess && (
                 <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-full flex flex-col">
                    <form onSubmit={(e) => e.preventDefault()} noValidate>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">{mode === 'create' ? 'New Farmer Registration' : 'Edit Farmer Details'}</h2>
                            
                             {hasDraft && mode === 'create' && currentStep === 1 && (
                                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
                                    <p className="font-bold">Unsaved Draft Found</p><p>Would you like to continue where you left off?</p>
                                    <div className="mt-3"><button type="button" onClick={handleRestoreDraft} className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold mr-2">Restore</button><button type="button" onClick={handleDiscardDraft} className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold">Discard</button></div>
                                </div>
                            )}

                            <ProgressBar currentStep={currentStep} />
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {currentStep === 1 && <section><h3 className="text-lg font-semibold text-green-700 mb-4">1. Personal Details</h3>
                                <FormRow><Label htmlFor="fullName">Full Name <span className="text-red-500 ml-1">*</span></Label><FormField><Input id="fullName" type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={getErrorClass('fullName')} /><InputError message={errors.fullName} onDismiss={() => handleDismissError('fullName')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="fatherHusbandName">Father/Husband Name <span className="text-red-500 ml-1">*</span></Label><FormField><Input id="fatherHusbandName" type="text" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleChange} className={getErrorClass('fatherHusbandName')} /><InputError message={errors.fatherHusbandName} onDismiss={() => handleDismissError('fatherHusbandName')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="aadhaarNumber">Aadhaar Number</Label><FormField><Input id="aadhaarNumber" type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className={getErrorClass('aadhaarNumber')} maxLength={12} disabled={mode === 'edit'} title={mode === 'edit' ? 'Aadhaar number cannot be changed.' : ''} /><InputError message={errors.aadhaarNumber} onDismiss={() => handleDismissError('aadhaarNumber')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="mobileNumber">Mobile Number <span className="text-red-500 ml-1">*</span></Label><FormField><Input id="mobileNumber" type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={getErrorClass('mobileNumber')} maxLength={10} /><InputError message={errors.mobileNumber} onDismiss={() => handleDismissError('mobileNumber')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="gender">Gender <span className="text-red-500 ml-1">*</span></Label><FormField><Select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={getErrorClass('gender')}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></Select></FormField></FormRow>
                                <FormRow><Label htmlFor="address">Address <span className="text-red-500 ml-1">*</span></Label><FormField><Textarea id="address" name="address" value={formData.address} onChange={handleChange} className={getErrorClass('address')} rows={3}></Textarea><InputError message={errors.address} onDismiss={() => handleDismissError('address')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="registrationDate">Registration Date</Label><FormField><Input id="registrationDate" type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className={getErrorClass('registrationDate')} max={new Date().toISOString().split('T')[0]} /><InputError message={errors.registrationDate} onDismiss={() => handleDismissError('registrationDate')} /></FormField></FormRow>
                                <FormRow><Label>Photo</Label><FormField>{photoPreview ? (<div className="flex items-center gap-4"><img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border"/><div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-green-700 font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>Photo Selected</span></div><button type="button" onClick={handleClearPhoto} className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold hover:bg-red-200">Remove</button></div></div>) : (<div className="flex items-center gap-4"><Input ref={fileInputRef} type="file" name="photo" accept="image/jpeg, image/png" onChange={handlePhotoChange} /><InputError message={errors.photo} onDismiss={() => handleDismissError('photo')} /></div>)}</FormField></FormRow>
                            </section>}

                            {currentStep === 2 && <section>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">2. Geographic Details</h3>
                                <FormRow><Label htmlFor="district">District <span className="text-red-500 ml-1">*</span></Label><FormField><Select id="district" name="district" value={formData.district} onChange={handleGeoChange} className={getErrorClass('district')}><option value="">-- Select a District --</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</Select><InputError message={errors.district} onDismiss={() => handleDismissError('district')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="mandal">Mandal <span className="text-red-500 ml-1">*</span></Label><FormField><Select id="mandal" name="mandal" value={formData.mandal} onChange={handleGeoChange} className={getErrorClass('mandal')} disabled={!formData.district}><option value="">-- Select a Mandal --</option>{mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}</Select><InputError message={errors.mandal} onDismiss={() => handleDismissError('mandal')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="village">Village <span className="text-red-500 ml-1">*</span></Label><FormField><Select id="village" name="village" value={formData.village} onChange={handleGeoChange} className={getErrorClass('village')} disabled={!formData.mandal}><option value="">-- Select a Village --</option>{villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}</Select><InputError message={errors.village} onDismiss={() => handleDismissError('village')} /></FormField></FormRow>
                                <FormRow><Label>Is in NE Region?</Label><FormField><div className="flex items-center h-full"><label className="inline-flex items-center"><Input type="checkbox" name="is_in_ne_region" checked={formData.is_in_ne_region} onChange={handleChange} className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500" /><span className="ml-2 text-gray-800">Yes</span></label></div></FormField></FormRow>
                                <FormRow><Label>Farmer Location</Label><FormField>
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                        <button type="button" onClick={handleCaptureLocation} disabled={isCapturingLocation} className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold flex items-center gap-2 disabled:bg-gray-400">
                                            {isCapturingLocation ? <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Capturing...</> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>Capture GPS</>}
                                        </button>
                                        <div className="flex-1 w-full"><Input type="text" readOnly value={formData.latitude !== undefined && formData.longitude !== undefined ? `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}` : 'No location captured'} className="bg-gray-100" /></div>
                                    </div>
                                    {locationError && <p className="text-red-600 text-sm mt-2">{locationError}</p>}
                                </FormField></FormRow>
                            </section>}

                             {currentStep === 3 && <section>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">3. Bank Details</h3>
                                <FormRow><Label htmlFor="bankAccountNumber">Bank Account No. <span className="text-red-500 ml-1">*</span></Label><FormField><Input id="bankAccountNumber" type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={getErrorClass('bankAccountNumber')} /><InputError message={errors.bankAccountNumber} onDismiss={() => handleDismissError('bankAccountNumber')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="ifscCode">IFSC Code <span className="text-red-500 ml-1">*</span></Label><FormField><Input id="ifscCode" type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={`${getErrorClass('ifscCode')} uppercase`} /><InputError message={errors.ifscCode} onDismiss={() => handleDismissError('ifscCode')} /></FormField></FormRow>
                                <FormRow><Label>Account Verified</Label><FormField><div className="flex items-center h-full"><label className="inline-flex items-center"><Input type="checkbox" name="accountVerified" checked={formData.accountVerified} onChange={handleChange} className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500" /><span className="ml-2 text-gray-800">Yes, account has been verified</span></label></div></FormField></FormRow>
                            </section>}

                             {currentStep === 4 && <section>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">4. Land & Plantation Details</h3>
                                <FormRow><Label htmlFor="primary_crop">Primary Crop</Label><FormField><Input id="primary_crop" type="text" name="primary_crop" value={formData.primary_crop} onChange={handleChange} className={getErrorClass('primary_crop')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="appliedExtent">Applied Extent (Acres)</Label><FormField><Input id="appliedExtent" type="number" step="0.01" name="appliedExtent" value={formData.appliedExtent} onChange={handleChange} className={getErrorClass('appliedExtent')} /><InputError message={errors.appliedExtent} onDismiss={() => handleDismissError('appliedExtent')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="approvedExtent">Approved Extent (Acres)</Label><FormField><Input id="approvedExtent" type="number" step="0.01" name="approvedExtent" value={formData.approvedExtent} onChange={handleChange} className={getErrorClass('approvedExtent')} /><InputError message={errors.approvedExtent} onDismiss={() => handleDismissError('approvedExtent')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="numberOfPlants">No. of Plants</Label><FormField><Input id="numberOfPlants" type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} className={getErrorClass('numberOfPlants')} /><InputError message={errors.numberOfPlants} onDismiss={() => handleDismissError('numberOfPlants')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="mlrdPlants">MLRD Plants</Label><FormField><Input id="mlrdPlants" type="number" name="mlrdPlants" value={formData.mlrdPlants} onChange={handleChange} className={getErrorClass('mlrdPlants')} /><InputError message={errors.mlrdPlants} onDismiss={() => handleDismissError('mlrdPlants')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="fullCostPlants">Full Cost Plants</Label><FormField><Input id="fullCostPlants" type="number" name="fullCostPlants" value={formData.fullCostPlants} onChange={handleChange} className={getErrorClass('fullCostPlants')} /></FormField></FormRow>
                                <FormRow><Label htmlFor="plantationDate">Plantation Date</Label><FormField><Input id="plantationDate" type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className={getErrorClass('plantationDate')} max={new Date().toISOString().split('T')[0]} /></FormField></FormRow>
                            </section>}
                            
                            {currentStep === 5 && <section>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">5. Review & Submit</h3>
                                {preparedFarmerData ? <ReviewStep /> : <p className="text-center text-gray-600 py-10">Please fill out all required fields in the previous steps.</p>}
                            </section>}
                        </div>
                        
                        <div className="p-6 bg-gray-100 flex justify-between items-center mt-auto rounded-b-lg">
                            <button type="button" onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                            <div className="flex items-center gap-4">
                                {currentStep > 1 && <button type="button" onClick={handlePrevious} className="px-6 py-2 bg-white border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition">Previous</button>}
                                {currentStep < STEPS.length -1 && <button type="button" onClick={handleNext} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Next</button>}
                                {currentStep === STEPS.length - 1 && <button type="button" onClick={handleSubmit} disabled={!!preparedFarmerData} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-400">{preparedFarmerData ? 'Ready' : 'Review'}</button>}
                                {currentStep === STEPS.length && <button type="button" onClick={handleConfirmSubmit} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-400">{isSubmitting ? 'Saving...' : 'Save Farmer'}</button>}
                            </div>
                        </div>
                    </form>
                    {showCancelConfirmation && <ConfirmationModal isOpen={showCancelConfirmation} title="Discard Changes?" message="Are you sure you want to cancel? Any unsaved changes will be lost." onConfirm={handleConfirmCancel} onCancel={handleAbortCancel} confirmText="Discard" confirmButtonVariant="destructive" />}
                    {showAiReview && preparedFarmerData && <AiReviewModal farmerData={preparedFarmerData} plotsData={[]} onClose={() => setShowAiReview(false)} />}
                </div>
            )}
            
            {showSuccess && (
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg text-center p-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2">{mode === 'create' ? 'Registration Successful' : 'Update Successful'}</h2>
                     <p className="text-gray-600 mb-6">{preparedFarmerData?.fullName} has been saved.</p>
                     <div className="flex justify-center gap-4">
                         <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                         {mode === 'create' && <button onClick={handleRegisterAnother} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Register Another</button>}
                     </div>
                </div>
            )}
        </div>
    );
}