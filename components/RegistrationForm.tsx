import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType, Village, Mandal } from '../types';
import { GEO_DATA } from '../data/geoData';
import ConfirmationModal from './ConfirmationModal';

interface RegistrationFormProps {
    onSubmit: (farmer: Farmer, photoFile?: File) => Promise<void>;
    onCancel: () => void;
    existingFarmers: Farmer[];
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
    syncStatus: 'pending'
};

const DRAFT_STORAGE_KEY = 'hapsara-farmer-registration-draft';

// --- Geo Data Optimization ---
// Create a more efficient map-based structure for fast geo lookups
interface VillageInfo { name: string; }
interface MandalInfo { name: string; villages: Record<string, VillageInfo>; }
interface DistrictInfo { name: string; mandals: Record<string, MandalInfo>; }

const geoMap: Record<string, DistrictInfo> = GEO_DATA.reduce((distAcc, district) => {
    distAcc[district.code] = {
        name: district.name,
        mandals: district.mandals.reduce((mandAcc, mandal) => {
            mandAcc[mandal.code] = {
                name: mandal.name,
                villages: mandal.villages.reduce((villAcc, village) => {
                    villAcc[village.code] = { name: village.name };
                    return villAcc;
                }, {} as Record<string, VillageInfo>),
            };
            return mandAcc;
        }, {} as Record<string, MandalInfo>),
    };
    return distAcc;
}, {} as Record<string, DistrictInfo>);

// Helper function to get geo names from the optimized map
const getGeoName = (type: 'district' | 'mandal' | 'village', codes: { district: string; mandal?: string; village?: string }) => {
    try {
        const district = geoMap[codes.district];
        if (!district) return codes.district || 'N/A';
        if (type === 'district') return district.name;

        if (!codes.mandal) return 'N/A';
        const mandal = district.mandals[codes.mandal];
        if (!mandal) return codes.mandal || 'N/A';
        if (type === 'mandal') return mandal.name;
        
        if (!codes.village) return 'N/A';
        const village = mandal.villages[codes.village];
        if (!village) return codes.village || 'N/A';
        if (type === 'village') return village.name;
    } catch (e) {
        console.error("Error getting geo name:", e);
        return 'N/A';
    }
    return codes[type] || 'N/A';
};

/**
 * A custom hook to debounce a value.
 * This prevents a function from being called too frequently by delaying its update.
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

type FormRowProps = { children?: React.ReactNode };
const FormRow = ({ children }: FormRowProps) => <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">{children}</div>;

type FormFieldProps = { children?: React.ReactNode };
const FormField = ({ children }: FormFieldProps) => <div className="md:col-span-2">{children}</div>;

type FormLabelProps = { children?: React.ReactNode; required?: boolean };
const FormLabel = ({ children, required = false }: FormLabelProps) => <label className="font-medium text-gray-700">{children}{required && <span className="text-red-500 ml-1">*</span>}</label>;

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, onCancel, existingFarmers }) => {
    const [formData, setFormData] = useState<Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [preparedFarmerData, setPreparedFarmerData] = useState<Farmer | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const debouncedFormData = useDebounce(formData, 1000); // 1-second delay for auto-save
    
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

    // Check for a saved draft when the component mounts
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                // Check if the draft is just the initial form state
                if (JSON.stringify(draftData) !== JSON.stringify(initialFormData)) {
                     setHasDraft(true);
                }
            } catch (e) {
                console.error("Failed to parse draft", e);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        }
    }, []);

    // Effect to auto-save the form data to localStorage
    useEffect(() => {
        if (showConfirmation || hasDraft) return;
        const isInitial = JSON.stringify(debouncedFormData) === JSON.stringify(initialFormData);
        if (!isInitial) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(debouncedFormData));
        } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
    }, [debouncedFormData, showConfirmation, hasDraft]);
    
    const districtsForSelect = useMemo(() => Object.entries(geoMap).map(([code, { name }]) => ({ code, name })), []);

    const mandals = useMemo(() => {
        if (!formData.district || !geoMap[formData.district]) return [];
        const mandalData = geoMap[formData.district].mandals;
        // Convert back to array for dropdown rendering
        return Object.entries(mandalData).map(([code, { name }]) => ({ code, name, villages: [] as Village[] }));
    }, [formData.district]);

    const villages = useMemo(() => {
        if (!formData.district || !formData.mandal || !geoMap[formData.district]?.mandals[formData.mandal]) return [];
        const villageData = geoMap[formData.district].mandals[formData.mandal].villages;
        // Convert back to array for dropdown rendering
        return Object.entries(villageData).map(([code, { name }]) => ({ code, name }));
    }, [formData.district, formData.mandal]);

    const handleGeoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'district') {
                newState.mandal = '';
                newState.village = '';
            }
            if (name === 'mandal') {
                newState.village = '';
            }
            return newState;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setErrors(prev => ({...prev, photo: 'File size should not exceed 2MB'}));
                return;
            }
            if(!['image/jpeg', 'image/png'].includes(file.type)){
                setErrors(prev => ({...prev, photo: 'Only JPG/PNG files are allowed'}));
                return;
            }
            setPhotoFile(file); // Store the file object for upload
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setPhotoPreview(base64String); // For UI preview only
                setFormData(prev => ({ ...prev, photo: '' })); // Clear any old photo URL/base64
                setErrors(prev => {
                    const newErrors = {...prev};
                    delete newErrors.photo;
                    return newErrors;
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearPhoto = () => {
        setFormData(prev => ({ ...prev, photo: '' }));
        setPhotoPreview(null);
        setPhotoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset the file input
        }
    };
    
    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
        if (!formData.fatherHusbandName.trim()) newErrors.fatherHusbandName = "Father/Husband Name is required.";
        if (!formData.address.trim()) newErrors.address = "Address is required.";
        if (formData.aadhaarNumber.trim() && !/^\d{12}$/.test(formData.aadhaarNumber)) {
            newErrors.aadhaarNumber = "If provided, Aadhaar must be 12 digits.";
        }
        if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
            newErrors.mobileNumber = "Mobile number must be 10 digits and start with 6-9.";
        }
        if (!formData.district) newErrors.district = 'District is required.';
        if (!formData.mandal) newErrors.mandal = 'Mandal is required.';
        if (!formData.village) newErrors.village = 'Village is required.';
        if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = "Bank Account Number is required.";
        if (!formData.ifscCode.trim()) {
            newErrors.ifscCode = "IFSC Code is required.";
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
            newErrors.ifscCode = "Invalid IFSC code format (e.g., XXXX0000000).";
        }
        const appliedExtent = Number(formData.appliedExtent);
        if (appliedExtent > 0) {
            if (appliedExtent < 0.5) newErrors.appliedExtent = "Applied extent must be at least 0.5 acres.";
            if (appliedExtent > 100) newErrors.appliedExtent = "Applied extent cannot exceed 100 acres.";
        }
        const approvedExtent = Number(formData.approvedExtent);
        if (approvedExtent > 0) {
            if (approvedExtent < 0.5) newErrors.approvedExtent = "Approved extent must be at least 0.5 acres.";
            if (approvedExtent > 100) newErrors.approvedExtent = "Approved extent cannot exceed 100 acres.";
        }
        if (approvedExtent > 0 && appliedExtent > 0 && approvedExtent > appliedExtent) {
            newErrors.approvedExtent = "Approved extent cannot be greater than applied extent.";
        }
        const numberOfPlants = Number(formData.numberOfPlants);
        if (numberOfPlants > 0) {
            if (numberOfPlants < 20) newErrors.numberOfPlants = "Number of plants must be at least 20 for a viable plantation.";
            else if (numberOfPlants > 10000) newErrors.numberOfPlants = "Number of plants cannot exceed 10,000.";
            if (approvedExtent > 0) {
                const expectedPlants = approvedExtent * 57;
                const tolerance = expectedPlants * 0.1; // 10% tolerance
                if (numberOfPlants < expectedPlants - tolerance || numberOfPlants > expectedPlants + tolerance) {
                    newErrors.numberOfPlants = `Number of plants seems incorrect for ${approvedExtent} acres. It should be around ${Math.round(expectedPlants)}.`;
                }
            }
        }
        if (numberOfPlants > 0 && ((Number(formData.mlrdPlants) || 0) + (Number(formData.fullCostPlants) || 0) > numberOfPlants)) {
            newErrors.mlrdPlants = "Sum of MLRD and Full Cost plants cannot exceed total plants.";
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let registrationDateObj: Date | null = null;
        if (!formData.registrationDate) {
            newErrors.registrationDate = "Registration date is required.";
        } else {
            registrationDateObj = new Date(formData.registrationDate);
            if (isNaN(registrationDateObj.getTime())) {
                newErrors.registrationDate = "Please enter a valid registration date.";
                registrationDateObj = null;
            } else if (registrationDateObj > today) {
                newErrors.registrationDate = "Registration date cannot be a future date.";
            }
        }
        if (formData.plantationDate) {
            const plantationDateObj = new Date(formData.plantationDate);
            if (isNaN(plantationDateObj.getTime())) {
                newErrors.plantationDate = "Invalid plantation date format.";
            } else if (plantationDateObj > today) {
                newErrors.plantationDate = "Plantation date cannot be in the future.";
            } else if (registrationDateObj && plantationDateObj < registrationDateObj) {
                newErrors.plantationDate = "Plantation date cannot be before the registration date.";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, existingFarmers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const regYear = new Date(formData.registrationDate).getFullYear().toString().slice(-2);
            const farmersInVillage = existingFarmers.filter(f => f.village === formData.village && f.mandal === formData.mandal && f.district === formData.district);
            const seq = (farmersInVillage.length + 1).toString().padStart(3, '0');
            const farmerId = `${formData.district}${formData.mandal}${formData.village}${seq}`;
            const randomAppIdSuffix = Math.floor(1000 + Math.random() * 9000);
            const applicationId = `A${regYear}${formData.district}${formData.mandal}${formData.village}${randomAppIdSuffix}`;
            const asoId = `SO${regYear}${formData.district}${formData.mandal}${Math.floor(100 + Math.random() * 900)}`;
            const now = new Date().toISOString();

            const farmerData: Farmer = {
                ...formData,
                id: farmerId,
                farmerId,
                applicationId,
                asoId,
                createdAt: now,
                updatedAt: now,
            };

            setPreparedFarmerData(farmerData);
            setShowConfirmation(true);
        }
    };
    
    const handleConfirmSubmit = async () => {
        if (preparedFarmerData) {
            setIsSubmitting(true);
            try {
                await onSubmit(preparedFarmerData, photoFile);
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                setShowConfirmation(false);
                setShowSuccess(true);
            } catch (error) {
                console.error("Submission failed:", error);
                alert("An error occurred while saving the farmer. Please try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmation(false);
        setPreparedFarmerData(null);
    };

    const handleCancel = () => {
        setShowCancelConfirmation(true);
    };
    
    const handleConfirmCancel = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setShowCancelConfirmation(false);
        onCancel();
    };

    const handleAbortCancel = () => {
        setShowCancelConfirmation(false);
    };

    const handleRestoreDraft = () => {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                setFormData(draftData);
                if (draftData.photo) { // This field might contain old base64 data
                    setPhotoPreview(draftData.photo);
                }
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const getInputClass = (fieldName: keyof typeof errors) => `w-full p-2.5 bg-white border rounded-lg text-sm text-gray-900 focus:ring-2 transition ${errors[fieldName] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'}`;
    const getSelectClass = (fieldName: keyof typeof errors) => `${getInputClass(fieldName)} appearance-none pr-10`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            {!showSuccess && (
                 <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">New Farmer Registration</h2>
                            
                            {hasDraft && (
                                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
                                    <p className="font-bold">Unsaved Draft Found</p>
                                    <p>Would you like to continue where you left off?</p>
                                    <div className="mt-3">
                                        <button type="button" onClick={handleRestoreDraft} className="px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold mr-2">Restore Draft</button>
                                        <button type="button" onClick={handleDiscardDraft} className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold">Discard</button>
                                    </div>
                                </div>
                            )}

                            <section>
                                <h3 className="text-lg font-semibold text-green-700 mb-4">1. Personal Details</h3>
                                <FormRow><FormLabel required>Full Name</FormLabel><FormField><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={getInputClass('fullName')} /><InputError message={errors.fullName} onDismiss={() => handleDismissError('fullName')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Father/Husband Name</FormLabel><FormField><input type="text" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleChange} className={getInputClass('fatherHusbandName')} /><InputError message={errors.fatherHusbandName} onDismiss={() => handleDismissError('fatherHusbandName')} /></FormField></FormRow>
                                <FormRow><FormLabel>Aadhaar Number</FormLabel><FormField><input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className={getInputClass('aadhaarNumber')} maxLength={12} /><InputError message={errors.aadhaarNumber} onDismiss={() => handleDismissError('aadhaarNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Mobile Number</FormLabel><FormField><input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={getInputClass('mobileNumber')} maxLength={10} /><InputError message={errors.mobileNumber} onDismiss={() => handleDismissError('mobileNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>Gender</FormLabel><FormField><div className="relative"><select name="gender" value={formData.gender} onChange={handleChange} className={getSelectClass('gender')}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel required>Address</FormLabel><FormField><textarea name="address" value={formData.address} onChange={handleChange} className={getInputClass('address')} rows={3}></textarea><InputError message={errors.address} onDismiss={() => handleDismissError('address')} /></FormField></FormRow>
                                <FormRow><FormLabel>PPB/ROFR ID</FormLabel><FormField><input type="text" name="ppbRofrId" value={formData.ppbRofrId} onChange={handleChange} className={getInputClass('ppbRofrId')} /><InputError message={errors.ppbRofrId} onDismiss={() => handleDismissError('ppbRofrId')} /></FormField></FormRow>
                                <FormRow><FormLabel>Registration Date</FormLabel><FormField><input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className={getInputClass('registrationDate')} max={new Date().toISOString().split('T')[0]} /><InputError message={errors.registrationDate} onDismiss={() => handleDismissError('registrationDate')} /></FormField></FormRow>
                                <FormRow>
                                    <FormLabel>Photo</FormLabel>
                                    <FormField>
                                        {photoPreview ? (
                                            <div className="flex items-center gap-4">
                                                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border"/>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-green-700 font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>Photo Selected</span></div>
                                                    <button type="button" onClick={handleClearPhoto} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md hover:bg-red-200 transition">Remove</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <input ref={fileInputRef} type="file" accept="image/jpeg, image/png" onChange={handlePhotoChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                                        )}
                                        <InputError message={errors.photo} onDismiss={() => handleDismissError('photo')} />
                                    </FormField>
                                </FormRow>
                            </section>
                            
                            <section className="mt-6">
                                <h3 className="text-lg font-semibold text-green-700 mb-4">2. Geographic Details</h3>
                                <FormRow><FormLabel required>District</FormLabel><FormField><div className="relative"><select name="district" value={formData.district} onChange={handleGeoChange} className={getSelectClass('district')}><option value="">-- Select District --</option>{districtsForSelect.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.district} onDismiss={() => handleDismissError('district')}/></FormField></FormRow>
                                <FormRow><FormLabel required>Mandal</FormLabel><FormField><div className="relative"><select name="mandal" value={formData.mandal} onChange={handleGeoChange} className={getSelectClass('mandal')} disabled={!formData.district}><option value="">-- Select Mandal --</option>{mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.mandal} onDismiss={() => handleDismissError('mandal')}/></FormField></FormRow>
                                <FormRow><FormLabel required>Village</FormLabel><FormField><div className="relative"><select name="village" value={formData.village} onChange={handleGeoChange} className={getSelectClass('village')} disabled={!formData.mandal}><option value="">-- Select Village --</option>{villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div><InputError message={errors.village} onDismiss={() => handleDismissError('village')}/></FormField></FormRow>
                            </section>
                            
                            <section className="mt-6">
                                <h3 className="text-lg font-semibold text-green-700 mb-4">3. Bank Details</h3>
                                <FormRow><FormLabel required>Bank Account Number</FormLabel><FormField><input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={getInputClass('bankAccountNumber')} /><InputError message={errors.bankAccountNumber} onDismiss={() => handleDismissError('bankAccountNumber')} /></FormField></FormRow>
                                <FormRow><FormLabel required>IFSC Code</FormLabel><FormField><input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={getInputClass('ifscCode')} /><InputError message={errors.ifscCode} onDismiss={() => handleDismissError('ifscCode')} /></FormField></FormRow>
                                <FormRow>
                                    <FormLabel><div className="relative flex items-center gap-1.5 group cursor-help"><span>Account Verified</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">Indicates if the farmer's bank account details have been manually confirmed for accuracy before subsidy payments.</div></div></FormLabel>
                                    <FormField><label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-green-50 transition w-max"><input type="checkbox" name="accountVerified" checked={formData.accountVerified} onChange={handleChange} className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500" /><span className="ml-3 text-gray-700 font-medium">Mark as Verified</span></label></FormField>
                                </FormRow>
                            </section>

                            <section className="mt-6">
                                <h3 className="text-lg font-semibold text-green-700 mb-4">4. Land & Plantation Details</h3>
                                <FormRow><FormLabel>Applied Extent (Acres)</FormLabel><FormField><input type="number" step="0.01" name="appliedExtent" value={formData.appliedExtent} onChange={handleChange} className={getInputClass('appliedExtent')} /><InputError message={errors.appliedExtent} onDismiss={() => handleDismissError('appliedExtent')} /></FormField></FormRow>
                                <FormRow><FormLabel>Approved Extent (Acres)</FormLabel><FormField><input type="number" step="0.01" name="approvedExtent" value={formData.approvedExtent} onChange={handleChange} className={getInputClass('approvedExtent')} /><InputError message={errors.approvedExtent} onDismiss={() => handleDismissError('approvedExtent')} /></FormField></FormRow>
                                <FormRow><FormLabel>Number of Plants</FormLabel><FormField><input type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} className={getInputClass('numberOfPlants')} /><InputError message={errors.numberOfPlants} onDismiss={() => handleDismissError('numberOfPlants')} /></FormField></FormRow>
                                <FormRow><FormLabel>Method of Plantation</FormLabel><FormField><div className="relative"><select name="methodOfPlantation" value={formData.methodOfPlantation} onChange={handleChange} className={getSelectClass('methodOfPlantation')}>{Object.values(PlantationMethod).map(s => <option key={s} value={s}>{s}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel>Plant Type</FormLabel><FormField><div className="relative"><select name="plantType" value={formData.plantType} onChange={handleChange} className={getSelectClass('plantType')}>{Object.values(PlantType).map(s => <option key={s} value={s}>{s}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                                <FormRow><FormLabel>MLRD Plants</FormLabel><FormField><input type="number" name="mlrdPlants" value={formData.mlrdPlants} onChange={handleChange} className={getInputClass('mlrdPlants')} /><InputError message={errors.mlrdPlants} onDismiss={() => handleDismissError('mlrdPlants')} /></FormField></FormRow>
                                <FormRow><FormLabel>Full Cost Plants</FormLabel><FormField><input type="number" name="fullCostPlants" value={formData.fullCostPlants} onChange={handleChange} className={getInputClass('fullCostPlants')} /></FormField></FormRow>
                                <FormRow>
                                    <FormLabel>Plantation Date</FormLabel>
                                    <FormField><input type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className={`${getInputClass('plantationDate')} disabled:bg-gray-100 disabled:cursor-not-allowed`} min={formData.registrationDate} disabled={!formData.registrationDate} title={!formData.registrationDate ? "Please select a registration date first" : ""} /><InputError message={errors.plantationDate} onDismiss={() => handleDismissError('plantationDate')} /></FormField>
                                </FormRow>
                            </section>
                            
                             <section className="mt-6">
                                <h3 className="text-lg font-semibold text-green-700 mb-4">5. Application Status</h3>
                                <FormRow><FormLabel>Current Status</FormLabel><FormField><div className="relative"><select name="status" value={formData.status} onChange={handleChange} className={getSelectClass('status')}>{Object.values(FarmerStatus).map(s => <option key={s} value={s}>{s}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div></div></FormField></FormRow>
                            </section>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Register Farmer</button>
                        </div>
                    </form>
                </div>
            )}
            
            {showConfirmation && preparedFarmerData && (
                <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirm Details</h3>
                            <p className="text-gray-600 mb-6">Please review the information below before saving.</p>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2"><span className="font-semibold text-gray-600">Full Name:</span><span className="text-gray-900 font-medium">{preparedFarmerData.fullName}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="font-semibold text-gray-600">Hap ID:</span><span className="text-gray-900 font-mono">{preparedFarmerData.farmerId}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="font-semibold text-gray-600">Aadhaar:</span><span className="text-gray-900">{`**** **** ${preparedFarmerData.aadhaarNumber.slice(-4)}`}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="font-semibold text-gray-600">Mobile:</span><span className="text-gray-900">{preparedFarmerData.mobileNumber}</span></div>
                                <div className="flex justify-between border-b pb-2 items-start">
                                    <span className="font-semibold text-gray-600">Location:</span>
                                    <span className="text-gray-900 text-right">
                                        {getGeoName('village', { district: preparedFarmerData.district, mandal: preparedFarmerData.mandal, village: preparedFarmerData.village })},<br/>
                                        {getGeoName('mandal', { district: preparedFarmerData.district, mandal: preparedFarmerData.mandal })},<br/>
                                        {getGeoName('district', { district: preparedFarmerData.district })}
                                    </span>
                                </div>
                                <div className="flex justify-between pb-2"><span className="font-semibold text-gray-600">Approved Extent:</span><span className="text-gray-900">{preparedFarmerData.approvedExtent} Acres</span></div>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={handleCancelConfirmation} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition" disabled={isSubmitting}>Go Back & Edit</button>
                            <button type="button" onClick={handleConfirmSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-green-400 disabled:cursor-wait" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Confirm & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && preparedFarmerData && (
                 <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center animate-fade-in">
                    <div className="text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-4">Registration Successful!</h3>
                    <p className="text-gray-600 mt-2">
                        Farmer <span className="font-semibold">{preparedFarmerData.fullName}</span> has been successfully registered.
                    </p>
                    <p className="text-gray-600 mt-1">
                        Hap ID: <span className="font-mono bg-gray-100 p-1 rounded">{preparedFarmerData.farmerId}</span>
                    </p>
                    <div className="mt-8 flex gap-4 justify-center">
                        <button
                            type="button"
                            onClick={handleRegisterAnother}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold"
                        >
                            Register Another Farmer
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            
            {showCancelConfirmation && (
                <ConfirmationModal isOpen={showCancelConfirmation} title="Discard Changes?" message={<><p>Are you sure you want to discard your unsaved changes?</p><p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md font-semibold">This action will also clear your saved draft.</p></>} onConfirm={handleConfirmCancel} onCancel={handleAbortCancel} confirmText="Discard" confirmButtonClass="bg-red-600 hover:bg-red-700"/>
            )}
        </div>
    );
};

export default RegistrationForm;