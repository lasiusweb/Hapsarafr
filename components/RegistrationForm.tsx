import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType } from '../types';
import ConfirmationModal from './ConfirmationModal';
import AiReviewModal from './AiReviewModal';
import { getGeoName } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, VillageModel } from '../db';
import { Q } from '@nozbe/watermelondb';

interface RegistrationFormProps {
    onSubmit: (farmer: Farmer, photoFile?: File) => Promise<void>;
    onCancel: () => void;
    existingFarmers: Farmer[];
    mode?: 'create' | 'edit';
    existingFarmer?: Farmer | null;
}

const initialFormData: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = {
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
    applicationId: '',
    farmerId: '',
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

const FIELDS_BY_STEP: (keyof Farmer)[][] = [
    [], // 1-based index
    ['fullName', 'fatherHusbandName', 'address', 'aadhaarNumber', 'mobileNumber', 'registrationDate'],
    ['district', 'mandal', 'village'],
    ['bankAccountNumber', 'ifscCode'],
    ['appliedExtent', 'approvedExtent', 'numberOfPlants', 'mlrdPlants'],
];

const runValidationForStep = (step: number, data: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>): Record<string, string> => {
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

type FormLabelProps = { children?: React.ReactNode; required?: boolean };
const FormLabel = ({ children, required = false }: FormLabelProps) => <label className="font-medium text-gray-700">{children}{required && <span className="text-red-500 ml-1">*</span>}</label>;


const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, onCancel, existingFarmers, mode = 'create', existingFarmer = null }) => {
    const database = useDatabase();
    const [formData, setFormData] = useState<Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [preparedFarmerData, setPreparedFarmerData] = useState<Farmer | null>(null);
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
            const formStateFromFarmer: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> = { ...initialFormData, ...existingFarmer };
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
                FIELDS_BY_STEP[step].forEach(field => delete newErrors[field]);
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
            let farmerData: Farmer;
            if (mode === 'create') {
                const regYear = new Date(formData.registrationDate).getFullYear().toString().slice(-2);
                const farmersInVillage = existingFarmers.filter(f => f.village === formData.village && f.mandal === formData.mandal && f.district === formData.district);
                const seq = (farmersInVillage.length + 1).toString().padStart(3, '0');
                const farmerId = `${formData.district}${formData.mandal}${formData.village}${seq}`;
                const randomAppIdSuffix = Math.floor(1000 + Math.random() * 9000);
                const applicationId = `A${regYear}${formData.district}${formData.mandal}${formData.village}${randomAppIdSuffix}`;
                const asoId = `SO${regYear}${formData.district}${formData.mandal}${Math.floor(100 + Math.random() * 900)}`;
                farmerData = { ...formData, id: farmerId, farmerId, applicationId, asoId, createdAt: now, updatedAt: now };
            } else {
                farmerData = { ...existingFarmer!, ...formData, updatedAt: now };
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
                alert("An error occurred while saving the farmer. Please try again.");
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
    
    const getInputClass = (fieldName: keyof typeof errors) => `w-full p-2.5 bg-white border rounded-lg text-sm text-gray-900 focus:ring-2 transition ${errors[fieldName] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`;
    const getSelectClass = (fieldName: keyof typeof errors) => `${getInputClass(fieldName)} appearance-none pr-10`;

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
                    
                    {/* Generated IDs */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Generated IDs</h4>
                        <DetailItem label="Hap ID" value={preparedFarmerData.farmerId} />
                        <DetailItem label="Application ID" value={preparedFarmerData.applicationId} />
                    </div>
    
                    {/* Personal Details */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Personal Details</h4>
                        <DetailItem label="Full Name" value={preparedFarmerData.fullName} />
                        <DetailItem label="Father/Husband Name" value={preparedFarmerData.fatherHusbandName} />
                        <DetailItem label="Gender" value={preparedFarmerData.gender} />
                        <DetailItem label="Mobile Number" value={preparedFarmerData.mobileNumber} />
                        <DetailItem label="Aadhaar Number" value={preparedFarmerData.aadhaarNumber ? `**** **** ${preparedFarmerData.aadhaarNumber.slice(-4)}` : 'N/A'} />
                        <DetailItem label="Address" value={preparedFarmerData.address} />
                        <DetailItem label="PPB/ROFR ID" value={preparedFarmerData.ppbRofrId} />
                        <DetailItem label="Registration Date" value={new Date(preparedFarmerData.registrationDate).toLocaleDateString()} />
                    </div>
                    
                    {/* Geographic Details */}
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 mb-2">Geographic Details</h4>
                        <DetailItem label="District" value={getGeoName('district', preparedFarmerData)} />
                        <DetailItem label="Mandal" value={getGeoName('mandal', preparedFarmerData)} />
                        <DetailItem label="Village" value={getGeoName('village', preparedFarmerData)} />
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
                            {currentStep === 1 && <section><h3 className="text-lg font-semibold text-green-700 mb-4">1. Personal Details</h3><FormRow><FormLabel required>Full Name</FormLabel><FormField><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={getInputClass('fullName')} /><InputError message={errors.fullName} onDismiss={() => handleDismissError('fullName')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Father/Husband Name</FormLabel><FormField><input type="text" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleChange} className={getInputClass('fatherHusbandName')} /><InputError message={errors.fatherHusbandName} onDismiss={() => handleDismissError('fatherHusbandName')} /></FormField></FormRow>
                                <FormRow><FormLabel>Aadhaar Number</FormLabel><FormField><input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className={getInputClass('aadhaarNumber')} maxLength={12} disabled={mode === 'edit'} title={mode === 'edit' ? 'Aadhaar number cannot be changed.' : ''} /><InputError message={errors.aadhaarNumber} onDismiss={() => handleDismissError('aadhaarNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Mobile Number</FormLabel><FormField><input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={getInputClass('mobileNumber')} maxLength={10} /><InputError message={errors.mobileNumber} onDismiss={() => handleDismissError('mobileNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Gender</FormLabel><FormField><div className="relative"><select name="gender" value={formData.gender} onChange={handleChange} className={getSelectClass('gender')}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel required>Address</FormLabel><FormField><textarea name="address" value={formData.address} onChange={handleChange} className={getInputClass('address')} rows={3}></textarea><InputError message={errors.address} onDismiss={() => handleDismissError('address')} /></FormField></FormRow>
                                <FormRow><FormLabel>PPB/ROFR ID</FormLabel><FormField><input type="text" name="ppbRofrId" value={formData.ppbRofrId} onChange={handleChange} className={getInputClass('ppbRofrId')} /><InputError message={errors.ppbRofrId} onDismiss={() => handleDismissError('ppbRofrId')} /></FormField></FormRow>
                                <FormRow><FormLabel>Registration Date</FormLabel><FormField><input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className={getInputClass('registrationDate')} max={new Date().toISOString().split('T')[0]} /><InputError message={errors.registrationDate} onDismiss={() => handleDismissError('registrationDate')} /></FormField></FormRow>
                                <FormRow><FormLabel>Photo</FormLabel><FormField>{photoPreview ? (<div className="flex items-center gap-4"><img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border"/><div className="flex flex-col gap-1"><div className="flex items-center gap-1.5 text-green-700 font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>Photo Selected</span></div><button type="button" onClick={handleClearPhoto} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md hover:bg-red-200 transition">Remove</button></div></div>) : (<input ref={fileInputRef} type="file" accept="image/jpeg, image/png" onChange={handlePhotoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />)}<InputError message={errors.photo} onDismiss={() => handleDismissError('photo')} /></FormField></FormRow>
                            </section>}
                            {currentStep === 2 && <section><h3 className="text-lg font-semibold text-green-700 mb-4">2. Geographic Details</h3><FormRow><FormLabel required>District</FormLabel><FormField><div className="relative"><select name="district" value={formData.district} onChange={handleGeoChange} className={getSelectClass('district')} disabled={mode === 'edit'} title={mode === 'edit' ? 'Location cannot be changed after registration.' : ''}><option value="">-- Select District --</option>{districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.district} onDismiss={() => handleDismissError('district')}/></FormField></FormRow>
                                <FormRow><FormLabel required>Mandal</FormLabel><FormField><div className="relative"><select name="mandal" value={formData.mandal} onChange={handleGeoChange} className={getSelectClass('mandal')} disabled={!formData.district || mode === 'edit'} title={mode === 'edit' ? 'Location cannot be changed after registration.' : ''}><option value="">-- Select Mandal --</option>{mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.mandal} onDismiss={() => handleDismissError('mandal')}/></FormField></FormRow>
                                <FormRow><FormLabel required>Village</FormLabel><FormField><div className="relative"><select name="village" value={formData.village} onChange={handleChange} className={getSelectClass('village')} disabled={!formData.mandal || mode === 'edit'} title={mode === 'edit' ? 'Location cannot be changed after registration.' : ''}><option value="">-- Select Village --</option>{villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.village} onDismiss={() => handleDismissError('village')}/></FormField></FormRow>
                            </section>}
                            {currentStep === 3 && <section><h3 className="text-lg font-semibold text-green-700 mb-4">3. Bank Details</h3><FormRow><FormLabel required>Bank Account Number</FormLabel><FormField><input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={getInputClass('bankAccountNumber')} /><InputError message={errors.bankAccountNumber} onDismiss={() => handleDismissError('bankAccountNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>IFSC Code</FormLabel><FormField><input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={getInputClass('ifscCode')} /><InputError message={errors.ifscCode} onDismiss={() => handleDismissError('ifscCode')} /></FormField></FormRow>
                                <FormRow><FormLabel><div className="relative flex items-center gap-1.5 group cursor-help"><span>Account Verified</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Indicates if the farmer's bank account details have been manually confirmed for accuracy before subsidy payments.</div></div></FormLabel><FormField><label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-green-50 transition w-max"><input type="checkbox" name="accountVerified" checked={formData.accountVerified} onChange={handleChange} className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500" /><span className="ml-3 text-gray-700 font-medium">Mark as Verified</span></label></FormField></FormRow>
                            </section>}
                             {currentStep === 4 && <section><h3 className="text-lg font-semibold text-green-700 mb-4">4. Land & Plantation Details</h3><FormRow><FormLabel>Applied Extent (Acres)</FormLabel><FormField><input type="number" step="0.01" name="appliedExtent" value={formData.appliedExtent} onChange={handleChange} className={getInputClass('appliedExtent')} /><InputError message={errors.appliedExtent} onDismiss={() => handleDismissError('appliedExtent')} /></FormField></FormRow>
                                <FormRow><FormLabel>Approved Extent (Acres)</FormLabel><FormField><input type="number" step="0.01" name="approvedExtent" value={formData.approvedExtent} onChange={handleChange} className={getInputClass('approvedExtent')} /><InputError message={errors.approvedExtent} onDismiss={() => handleDismissError('approvedExtent')} /></FormField></FormRow>
                                <FormRow><FormLabel>Number of Plants</FormLabel><FormField><input type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} className={getInputClass('numberOfPlants')} /><InputError message={errors.numberOfPlants} onDismiss={() => handleDismissError('numberOfPlants')} /></FormField></FormRow>
                                <FormRow><FormLabel>Method of Plantation</FormLabel><FormField><div className="relative"><select name="methodOfPlantation" value={formData.methodOfPlantation} onChange={handleChange} className={getSelectClass('methodOfPlantation')}>{Object.values(PlantationMethod).map(s => <option key={s} value={s}>{s}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel>Plant Type</FormLabel><FormField><div className="relative"><select name="plantType" value={formData.plantType} onChange={handleChange} className={getSelectClass('plantType')}>{Object.values(PlantType).map(s => <option key={s} value={s}>{s}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel>MLRD Plants</FormLabel><FormField><input type="number" name="mlrdPlants" value={formData.mlrdPlants} onChange={handleChange} className={getInputClass('mlrdPlants')} /><InputError message={errors.mlrdPlants} onDismiss={() => handleDismissError('mlrdPlants')} /></FormField></FormRow>
                                <FormRow><FormLabel>Full Cost Plants</FormLabel><FormField><input type="number" name="fullCostPlants" value={formData.fullCostPlants} onChange={handleChange} className={getInputClass('fullCostPlants')} /></FormField></FormRow>
                                <FormRow><FormLabel>Plantation Date</FormLabel><FormField><input type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className={`${getInputClass('plantationDate')} disabled:bg-gray-100 disabled:cursor-not-allowed`} min={formData.registrationDate} disabled={!formData.registrationDate} title={!formData.registrationDate ? "Please select a registration date first" : ""} /><InputError message={errors.plantationDate} onDismiss={() => handleDismissError('plantationDate')} /></FormField></FormRow>
                                <FormRow><FormLabel>Geolocation</FormLabel><FormField><div className="flex flex-col sm:flex-row gap-4"><input type="number" step="any" name="latitude" placeholder="Latitude" value={formData.latitude ?? ''} onChange={handleChange} className={`${getInputClass('latitude')} flex-1`} /><input type="number" step="any" name="longitude" placeholder="Longitude" value={formData.longitude ?? ''} onChange={handleChange} className={`${getInputClass('longitude')} flex-1`} /><button type="button" onClick={handleCaptureLocation} disabled={isCapturingLocation} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2 disabled:bg-blue-300">{isCapturingLocation ? (<svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>)}<span>{isCapturingLocation ? 'Capturing...' : 'Capture'}</span></button></div>{locationError && <p className="mt-2 text-sm text-red-600">{locationError}</p>}</FormField></FormRow>
                            </section>}
                            {currentStep === 5 && <ReviewStep />}
                        </div>
                        
                        <div className="bg-gray-100 p-4 flex justify-between items-center gap-4 rounded-b-lg">
                            <button type="button" onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                            
                            <div className="flex items-center gap-4">
                                {currentStep > 1 && (
                                    <button type="button" onClick={handlePrevious} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Previous</button>
                                )}
                                
                                {currentStep < STEPS.length ? (
                                    <button type="button" onClick={handleNext} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Next</button>
                                ) : (
                                    <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">
                                        {mode === 'create' ? 'Register Farmer' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            )}
            
            {showAiReview && <AiReviewModal farmerData={formData} onClose={() => setShowAiReview(false)} />}

            {preparedFarmerData && currentStep === 5 && (
                <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">{mode === 'create' ? 'Confirm Details' : 'Confirm Changes'}</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to submit this information?</p>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={() => setPreparedFarmerData(null)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition" disabled={isSubmitting}>Go Back & Edit</button>
                            <button type="button" onClick={handleConfirmSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-green-400 disabled:cursor-wait" disabled={isSubmitting}>
                                {isSubmitting ? (mode === 'create' ? 'Saving...' : 'Updating...') : (mode === 'create' ? 'Confirm & Save' : 'Confirm & Update')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && preparedFarmerData && (
                 <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center animate-fade-in">
                    <div className="text-green-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-4">{mode === 'create' ? 'Registration Successful!' : 'Update Successful!'}</h3>
                    <p className="text-gray-600 mt-2">Farmer <span className="font-semibold">{preparedFarmerData.fullName}</span> has been successfully {mode === 'create' ? 'registered' : 'updated'}.</p>
                    <p className="text-gray-600 mt-1">Hap ID: <span className="font-mono bg-gray-100 p-1 rounded">{preparedFarmerData.farmerId}</span></p>
                    <div className="mt-8 flex gap-4 justify-center">
                        {mode === 'create' && (<button type="button" onClick={handleRegisterAnother} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Register Another Farmer</button>)}
                        <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Close</button>
                    </div>
                </div>
            )}
            
            {showCancelConfirmation && (
                <ConfirmationModal isOpen={showCancelConfirmation} title="Discard Changes?" message={<><p>Are you sure you want to discard your unsaved changes?</p>{mode === 'create' && <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md font-semibold">This action will also clear your saved draft.</p>}</>} onConfirm={handleConfirmCancel} onCancel={handleAbortCancel} confirmText="Discard" confirmButtonClass="bg-red-600 hover:bg-red-700"/>
            )}
        </div>
    );
};

export default RegistrationForm;