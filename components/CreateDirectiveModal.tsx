import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DistrictModel, MandalModel, DirectiveModel } from '../db';
import { DirectiveTaskType, TaskPriority, DirectiveStatus, User } from '../types';
import CustomSelect from './CustomSelect';
import { Q } from '@nozbe/watermelondb';

interface CreateDirectiveModalProps {
    onClose: () => void;
    currentUser: User;
}

const CreateDirectiveModal: React.FC<CreateDirectiveModalProps> = ({ onClose, currentUser }) => {
    const database = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [taskType, setTaskType] = useState<DirectiveTaskType>(DirectiveTaskType.PestScouting);
    const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium);
    const [districtCode, setDistrictCode] = useState('');
    const [mandalCode, setMandalCode] = useState('');
    const [details, setDetails] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Data for dropdowns
    const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const mandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));

    const districtOptions = useMemo(() => districts.map(d => ({ value: d.code, label: d.name })), [districts]);
    const mandalOptions = useMemo(() => {
        if (!districtCode) return [];
        const selectedDistrict = districts.find(d => d.code === districtCode);
        if (!selectedDistrict) return [];
        return mandals
            .filter(m => m.districtId === selectedDistrict.id)
            .map(m => ({ value: m.code, label: m.name }));
    }, [mandals, districts, districtCode]);

    const handleDistrictChange = (code: string) => {
        setDistrictCode(code);
        setMandalCode('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mandalCode) {
            alert("Please select a district and mandal.");
            return;
        }
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<DirectiveModel>('directives').create(d => {
                    d.createdByGovUserId = currentUser.id;
                    d.administrativeCode = `${districtCode}-${mandalCode}`;
                    d.taskType = taskType;
                    d.priority = priority;
                    d.detailsJson = JSON.stringify({ instructions: details });
                    d.dueDate = dueDate || undefined;
                    d.status = DirectiveStatus.Open;
                    d.syncStatusLocal = 'pending';
                });
            });
            onClose();
        } catch (error) {
            console.error("Failed to create directive:", error);
            alert("An error occurred. Could not create the directive.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Create New Directive</h2>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Task Type</label>
                        <CustomSelect 
                            value={taskType}
                            onChange={v => setTaskType(v as DirectiveTaskType)}
                            options={[{ value: DirectiveTaskType.PestScouting, label: 'Pest Scouting' }]}
                        />
                         <p className="text-xs text-gray-500 mt-1">More task types will be available soon.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Area</label>
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect value={districtCode} onChange={handleDistrictChange} options={districtOptions} placeholder="-- Select District --" />
                            <CustomSelect value={mandalCode} onChange={setMandalCode} options={mandalOptions} placeholder="-- Select Mandal --" disabled={!districtCode} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Priority</label>
                             <CustomSelect value={priority} onChange={v => setPriority(v as TaskPriority)} options={Object.values(TaskPriority).map(p => ({value: p, label: p}))} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700">Instructions for Field Officer</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} required rows={5} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Please inspect at least 5 palms for signs of Rhinoceros Beetle damage..."></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Creating...' : 'Create Directive'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateDirectiveModal;