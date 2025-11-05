import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Farmer, FarmerStatus, PlantationMethod, PlantType, Village, Mandal } from '../types';
import { GEO_DATA } from '../data/geoData';

interface RegistrationFormProps {
    onSubmit: (farmer: Farmer) => void;
    onCancel: () => void;
    initialData?: Farmer | null;
    existingFarmers: Farmer[];
}

const initialFormData: Omit<Farmer, 'id'> = {
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
    syncedToSheets: false
};

// Helper function to get geo names from codes
const getGeoName = (type: 'district' | 'mandal' | 'village', codes: { district: string; mandal?: string; village?: string }) => {
    try {
        const districtData = GEO_DATA.find(d => d.code === codes.district);
        if (type === 'district') {
            return districtData?.name || codes.district;
        }
        if (!districtData) return codes[type] || 'N/A';

        const mandalData = districtData.mandals.find(m => m.code === codes.mandal);
        if (type === 'mandal') {
            return mandalData?.name || codes.mandal;
        }
        if (!mandalData) return codes[type] || 'N/A';

        if (type === 'village') {
            const villageData = mandalData.villages.find(v => v.code === codes.village);
            return villageData?.name || codes.village;
        }
    } catch (e) {
        console.error("Error getting geo name:", e);
        return 'N/A';
    }
    return codes[type] || 'N/A';
};

// FIX: Moved helper components outside of the RegistrationForm component to prevent re-creation on every render and fix typing issues.
// By defining props types separately, we improve readability and avoid potential TypeScript parsing issues with complex inline types.
// FIX: Made `children` prop optional to resolve TypeScript errors where children were not being detected. The component usage in this file always provides children, so this change is safe.
type FormRowProps = { children?: React.ReactNode };
const FormRow = ({ children }: FormRowProps) => <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">{children}</div>;

// FIX: Made `children` prop optional to resolve TypeScript errors where children were not being detected. The component usage in this file always provides children, so this change is safe.
type FormFieldProps = { children?: React.ReactNode };
const FormField = ({ children }: FormFieldProps) => <div className="md:col-span-2">{children}</div>;

// FIX: Made `children` prop optional to resolve TypeScript errors where children were not being detected. The component usage in this file always provides children, so this change is safe.
type FormLabelProps = { children?: React.ReactNode; required?: boolean };
const FormLabel = ({ children, required = false }: FormLabelProps) => <label className="font-medium text-gray-700">{children}{required && <span className="text-red-500 ml-1">*</span>}</label>;
const InputError = ({ message }: { message?: string }) => message ? <p className="text-sm text-red-600 mt-1">{message}</p> : null;

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, onCancel, initialData, existingFarmers }) => {
    const [formData, setFormData] = useState<Omit<Farmer, 'id'>>(initialData ? { ...initialData } : initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mandals, setMandals] = useState<Mandal[]>([]);
    const [villages, setVillages] = useState<Village[]>([]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [preparedFarmerData, setPreparedFarmerData] = useState<Farmer | null>(null);
    
    useEffect(() => {
        if(initialData?.district) {
            const selectedDistrict = GEO_DATA.find(d => d.code === initialData.district);
            setMandals(selectedDistrict?.mandals || []);
        }
        if(initialData?.mandal) {
             const selectedDistrict = GEO_DATA.find(d => d.code === initialData.district);
             const selectedMandal = selectedDistrict?.mandals.find(m => m.code === initialData.mandal);
             setVillages(selectedMandal?.villages || []);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    const handleGeoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        handleChange(e);

        if(name === 'district'){
            const selectedDistrict = GEO_DATA.find(d => d.code === value);
            setMandals(selectedDistrict?.mandals || []);
            setVillages([]);
            setFormData(prev => ({...prev, mandal: '', village: ''}));
        } else if(name === 'mandal'){
            const selectedDistrict = GEO_DATA.find(d => d.code === formData.district);
            const selectedMandal = selectedDistrict?.mandals.find(m => m.code === value);
            setVillages(selectedMandal?.villages || []);
             setFormData(prev => ({...prev, village: ''}));
        }
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

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData(prev => ({ ...prev, photo: base64String }));
                setPhotoPreview(base64String);
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
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset the file input
        }
    };
    
    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
        if (!formData.fatherHusbandName.trim()) newErrors.fatherHusbandName = "Father/Husband Name is required.";
        if (!/^\d{12}$/.test(formData.aadhaarNumber)) newErrors.aadhaarNumber = "Aadhaar must be 12 digits.";
        if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) newErrors.mobileNumber = "Mobile number must be 10 digits and start with 6-9.";
        if (!formData.district) newErrors.district = 'District is required.';
        if (!formData.mandal) newErrors.mandal = 'Mandal is required.';
        if (!formData.village) newErrors.village = 'Village is required.';
        if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) newErrors.ifscCode = "Invalid IFSC code format (e.g., XXXX0000000).";
        
        // Relational validations for optional fields
        if (formData.approvedExtent > formData.appliedExtent) newErrors.approvedExtent = "Approved extent cannot be greater than applied extent.";
        
        const expectedPlants = formData.approvedExtent * 57;
        const tolerance = expectedPlants * 0.05;
        if (formData.numberOfPlants > 0 && (formData.numberOfPlants < expectedPlants - tolerance || formData.numberOfPlants > expectedPlants + tolerance)) {
            newErrors.numberOfPlants = `Number of plants should be approx. ${Math.round(expectedPlants)} (57 per acre).`;
        }

        // Date Validations
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize for date-only comparison

        let registrationDateObj: Date | null = null;
        if (!formData.registrationDate) {
            newErrors.registrationDate = "Registration date is required.";
        } else {
            registrationDateObj = new Date(formData.registrationDate);
            // Check for invalid date format
            if (isNaN(registrationDateObj.getTime())) {
                newErrors.registrationDate = "Please enter a valid registration date.";
                registrationDateObj = null; // Invalidate for later checks
            } else if (registrationDateObj > today) {
                // Check if the date is in the future
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
                newErrors.plantationDate = "Plantation date cannot be before registration date.";
            }
        }
        
        if (formData.numberOfPlants > 0 && ((Number(formData.mlrdPlants) || 0) + (Number(formData.fullCostPlants) || 0) > formData.numberOfPlants)) {
            newErrors.mlrdPlants = "Sum of MLRD and Full Cost plants cannot exceed total plants.";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            let farmerData = { ...formData };
            if (!initialData) { // Only generate IDs for new farmers
                const regYear = new Date(formData.registrationDate).getFullYear().toString().slice(-2);
                
                const farmersInVillageThisYear = existingFarmers.filter(f => 
                    f.village === formData.village && 
                    f.mandal === formData.mandal && 
                    f.district === formData.district && 
                    new Date(f.registrationDate).getFullYear() === new Date(formData.registrationDate).getFullYear()
                );
                
                const seq = (farmersInVillageThisYear.length + 1).toString().padStart(3, '0');

                farmerData.farmerId = `${formData.district}${formData.mandal}${formData.village}${regYear}${seq}`;
                
                const randomAppIdSuffix = Math.floor(1000 + Math.random() * 9000);
                farmerData.applicationId = `A${regYear}${formData.district}${formData.mandal}${formData.village}${randomAppIdSuffix}`;
                
                farmerData.asoId = `SO${regYear}${formData.district}${formData.mandal}${Math.floor(100 + Math.random() * 900)}`;

                farmerData.id = farmerData.farmerId;
            } else {
                farmerData.id = initialData.id;
            }

            setPreparedFarmerData(farmerData as Farmer);
            setShowConfirmation(true);
        }
    };
    
    const handleConfirmSubmit = () => {
        if (preparedFarmerData) {
            onSubmit(preparedFarmerData);
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmation(false);
        setPreparedFarmerData(null);
    };

    const handleCancel = () => {
        if (window.confirm('Are you sure you want to discard unsaved changes?')) {
            onCancel();
        }
    };
    
    const inputClass = "w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition";
    const selectInputClass = `${inputClass} appearance-none pr-10`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">{initialData ? 'Edit Farmer Details' : 'New Farmer Registration'}</h2>
                        
                        {/* Personal Details */}
                        <section>
                            <h3 className="text-lg font-semibold text-green-700 mb-4">1. Personal Details</h3>
                            <FormRow>
                                <FormLabel required>Full Name</FormLabel>
                                <FormField>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.fullName} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel required>Father/Husband Name</FormLabel>
                                <FormField>
                                    <input type="text" name="fatherHusbandName" value={formData.fatherHusbandName} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.fatherHusbandName} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel required>Aadhaar Number</FormLabel>
                                <FormField>
                                    <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} className={inputClass} maxLength={12} />
                                    <InputError message={errors.aadhaarNumber} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel required>Mobile Number</FormLabel>
                                <FormField>
                                    <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={inputClass} maxLength={10} />
                                    <InputError message={errors.mobileNumber} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel required>Gender</FormLabel>
                                <FormField>
                                    <div className="relative">
                                        <select name="gender" value={formData.gender} onChange={handleChange} className={selectInputClass}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel required>Address</FormLabel>
                                <FormField>
                                    <textarea name="address" value={formData.address} onChange={handleChange} className={inputClass} rows={3}></textarea>
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel>PPB/ROFR ID</FormLabel>
                                <FormField>
                                    <input type="text" name="ppbRofrId" value={formData.ppbRofrId} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.ppbRofrId} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel>Photo</FormLabel>
                                <FormField>
                                    {photoPreview ? (
                                        <div className="flex items-center gap-4">
                                            <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border"/>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-green-700 font-medium">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span>Photo Selected</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={handleClearPhoto} 
                                                    className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md hover:bg-red-200 transition"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/jpeg, image/png" 
                                            onChange={handlePhotoChange} 
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                        />
                                    )}
                                    <InputError message={errors.photo} />
                                </FormField>
                            </FormRow>
                        </section>
                        
                        {/* Geographic Details */}
                        <section className="mt-6">
                             <h3 className="text-lg font-semibold text-green-700 mb-4">2. Geographic Details</h3>
                            {initialData ? (
                                <>
                                    <FormRow>
                                        <FormLabel>District</FormLabel>
                                        <FormField>
                                            <p className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-900">{getGeoName('district', { district: formData.district })}</p>
                                        </FormField>
                                    </FormRow>
                                    <FormRow>
                                        <FormLabel>Mandal</FormLabel>
                                        <FormField>
                                            <p className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-900">{getGeoName('mandal', { district: formData.district, mandal: formData.mandal })}</p>
                                        </FormField>
                                    </FormRow>
                                    <FormRow>
                                        <FormLabel>Village</FormLabel>
                                        <FormField>
                                            <p className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-900">{getGeoName('village', { district: formData.district, mandal: formData.mandal, village: formData.village })}</p>
                                        </FormField>
                                    </FormRow>
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-start-2 md:col-span-2">
                                            <p className="text-xs text-gray-500 mt-1">Geographic details cannot be changed after registration as they are part of the Farmer ID.</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FormRow>
                                        <FormLabel required>District</FormLabel>
                                        <FormField>
                                            <div className="relative">
                                                <select name="district" value={formData.district} onChange={handleGeoChange} className={selectInputClass}>
                                                    <option value="">-- Select District --</option>
                                                    {GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                   <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                            <InputError message={errors.district}/>
                                        </FormField>
                                    </FormRow>
                                    <FormRow>
                                        <FormLabel required>Mandal</FormLabel>
                                        <FormField>
                                            <div className="relative">
                                                <select name="mandal" value={formData.mandal} onChange={handleGeoChange} className={selectInputClass} disabled={!formData.district}>
                                                    <option value="">-- Select Mandal --</option>
                                                    {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                   <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                             <InputError message={errors.mandal}/>
                                        </FormField>
                                    </FormRow>
                                    <FormRow>
                                        <FormLabel required>Village</FormLabel>
                                        <FormField>
                                            <div className="relative">
                                                <select name="village" value={formData.village} onChange={handleChange} className={selectInputClass} disabled={!formData.mandal}>
                                                    <option value="">-- Select Village --</option>
                                                    {villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                   <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                             <InputError message={errors.village}/>
                                        </FormField>
                                    </FormRow>
                                </>
                            )}
                        </section>
                        
                         {/* Bank Details */}
                        <section className="mt-6">
                            <h3 className="text-lg font-semibold text-green-700 mb-4">3. Bank Details</h3>
                            <FormRow>
                                <FormLabel>Bank Account Number</FormLabel>
                                <FormField>
                                    <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={inputClass} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>IFSC Code</FormLabel>
                                <FormField>
                                    <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.ifscCode} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Account Verified</FormLabel>
                                <FormField>
                                    <label className="flex items-center cursor-pointer">
                                      <input type="checkbox" name="accountVerified" checked={formData.accountVerified} onChange={handleChange} className="form-checkbox h-5 w-5 text-green-600 rounded" />
                                      <span className="ml-2 text-gray-700">Verified</span>
                                    </label>
                                </FormField>
                            </FormRow>
                        </section>

                        {/* Plantation Details */}
                        <section className="mt-6">
                            <h3 className="text-lg font-semibold text-green-700 mb-4">4. Land & Plantation Details</h3>
                             <FormRow>
                                <FormLabel>Applied Extent (Acres)</FormLabel>
                                <FormField><input type="number" step="0.01" name="appliedExtent" value={formData.appliedExtent} onChange={handleChange} className={inputClass} /></FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Approved Extent (Acres)</FormLabel>
                                <FormField>
                                    <input type="number" step="0.01" name="approvedExtent" value={formData.approvedExtent} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.approvedExtent} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Number of Plants</FormLabel>
                                <FormField>
                                    <input type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.numberOfPlants} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Method of Plantation</FormLabel>
                                <FormField>
                                    <div className="relative">
                                        <select name="methodOfPlantation" value={formData.methodOfPlantation} onChange={handleChange} className={selectInputClass}>
                                            {Object.values(PlantationMethod).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Plant Type</FormLabel>
                                <FormField>
                                    <div className="relative">
                                        <select name="plantType" value={formData.plantType} onChange={handleChange} className={selectInputClass}>
                                            {Object.values(PlantType).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>MLRD Plants</FormLabel>
                                <FormField>
                                    <input type="number" name="mlrdPlants" value={formData.mlrdPlants} onChange={handleChange} className={inputClass} />
                                    <InputError message={errors.mlrdPlants} />
                                </FormField>
                            </FormRow>
                             <FormRow>
                                <FormLabel>Full Cost Plants</FormLabel>
                                <FormField>
                                    <input type="number" name="fullCostPlants" value={formData.fullCostPlants} onChange={handleChange} className={inputClass} />
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel>Plantation Date</FormLabel>
                                <FormField>
                                    <input type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className={inputClass} />
                                     <InputError message={errors.plantationDate} />
                                </FormField>
                            </FormRow>
                        </section>
                        
                        {/* Workflow Status */}
                         <section className="mt-6">
                            <h3 className="text-lg font-semibold text-green-700 mb-4">5. Application Status</h3>
                            <FormRow>
                                <FormLabel>Current Status</FormLabel>
                                <FormField>
                                    <div className="relative">
                                        <select name="status" value={formData.status} onChange={handleChange} className={selectInputClass}>
                                            {Object.values(FarmerStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </FormRow>
                            <FormRow>
                                <FormLabel>Registration Date</FormLabel>
                                <FormField>
                                    <input type="date" name="registrationDate" value={formData.registrationDate} onChange={handleChange} className={inputClass} disabled={!!initialData} />
                                    <InputError message={errors.registrationDate} />
                                </FormField>
                            </FormRow>
                        </section>

                    </div>
                    <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                        <button type="button" onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">{initialData ? 'Save Changes' : 'Register Farmer'}</button>
                    </div>
                </form>
            </div>
            
            {showConfirmation && preparedFarmerData && (
                <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirm Details</h3>
                            <p className="text-gray-600 mb-6">Please review the information below before saving.</p>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold text-gray-600">Full Name:</span>
                                    <span className="text-gray-900 font-medium">{preparedFarmerData.fullName}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold text-gray-600">Farmer ID:</span>
                                    <span className="text-gray-900 font-mono">{preparedFarmerData.farmerId}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold text-gray-600">Aadhaar:</span>
                                    <span className="text-gray-900">{`**** **** ${preparedFarmerData.aadhaarNumber.slice(-4)}`}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="font-semibold text-gray-600">Mobile:</span>
                                    <span className="text-gray-900">{preparedFarmerData.mobileNumber}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2 items-start">
                                    <span className="font-semibold text-gray-600">Location:</span>
                                    <span className="text-gray-900 text-right">
                                        {getGeoName('village', { district: preparedFarmerData.district, mandal: preparedFarmerData.mandal, village: preparedFarmerData.village })},<br/>
                                        {getGeoName('mandal', { district: preparedFarmerData.district, mandal: preparedFarmerData.mandal })}
                                    </span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="font-semibold text-gray-600">Approved Extent:</span>
                                    <span className="text-gray-900">{preparedFarmerData.approvedExtent} Acres</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={handleCancelConfirmation} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Go Back & Edit</button>
                            <button type="button" onClick={handleConfirmSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Confirm & Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistrationForm;