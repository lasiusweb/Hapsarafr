import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CustomFieldDefinitionModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { CustomFieldType } from '../types';
import CustomSelect from './CustomSelect';

interface SchemaManagerPageProps {
    onBack: () => void;
}

interface ModalState {
    isOpen: boolean;
    mode: 'add' | 'edit';
    item?: CustomFieldDefinitionModel;
}

const SchemaManagerPage: React.FC<SchemaManagerPageProps> = ({ onBack }) => {
    const database = useDatabase();
    const customFieldsQuery = useMemo(() => database.get<CustomFieldDefinitionModel>('custom_field_definitions').query(Q.where('model_name', 'farmer'), Q.sortBy('sort_order', Q.asc)), [database]);
    const customFields = useQuery(customFieldsQuery);

    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add' });
    const [formState, setFormState] = useState({
        fieldName: '',
        fieldLabel: '',
        // FIX: Cast initial value to CustomFieldType to ensure correct type inference.
        fieldType: CustomFieldType.Text,
        options: '',
        isRequired: false,
    });
    
    useEffect(() => {
        if (modalState.isOpen && modalState.mode === 'edit' && modalState.item) {
            setFormState({
                fieldName: modalState.item.fieldName,
                fieldLabel: modalState.item.fieldLabel,
                fieldType: modalState.item.fieldType as CustomFieldType,
                options: modalState.item.options.join(', '),
                isRequired: modalState.item.isRequired,
            });
        } else {
             // FIX: Cast initial value to CustomFieldType to ensure correct type inference.
            setFormState({ fieldName: '', fieldLabel: '', fieldType: CustomFieldType.Text, options: '', isRequired: false });
        }
    }, [modalState]);


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const { fieldName, fieldLabel, fieldType, options, isRequired } = formState;
        if (!fieldName || !fieldLabel) {
            alert('Field Name and Field Label are required.');
            return;
        }

        const formattedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '');

        await database.write(async () => {
            if (modalState.mode === 'edit' && modalState.item) {
                await modalState.item.update(field => {
                    field.fieldLabel = fieldLabel;
                    field.fieldType = fieldType;
                    field.optionsJson = fieldType === 'dropdown' ? JSON.stringify(options.split(',').map(s => s.trim())) : undefined;
                    field.isRequired = isRequired;
                });
            } else {
                const existingField = await database.get<CustomFieldDefinitionModel>('custom_field_definitions').query(Q.where('field_name', formattedFieldName)).fetch();
                if(existingField.length > 0) {
                    alert(`Field with name "${formattedFieldName}" already exists.`);
                    return;
                }

                await database.get<CustomFieldDefinitionModel>('custom_field_definitions').create(field => {
                    field.modelName = 'farmer';
                    field.fieldName = formattedFieldName;
                    field.fieldLabel = fieldLabel;
                    field.fieldType = fieldType;
                    field.optionsJson = fieldType === 'dropdown' ? JSON.stringify(options.split(',').map(s => s.trim())) : undefined;
                    field.isRequired = isRequired;
                    field.sortOrder = customFields.length;
                });
            }
        });
        setModalState({ isOpen: false, mode: 'add' });
    };

    const handleDelete = async (field: CustomFieldDefinitionModel) => {
        if (window.confirm(`Are you sure you want to delete the "${field.fieldLabel}" field? This cannot be undone.`)) {
            await database.write(async () => {
                await (field as any).destroyPermanently();
            });
        }
    };

    const fieldTypeOptions = [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
        { value: 'dropdown', label: 'Dropdown' },
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Schema & Form Manager</h1>
                        <p className="text-gray-500">Define custom data fields for your models.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Admin Panel
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Custom Fields for Farmers</h2>
                        <button onClick={() => setModalState({ isOpen: true, mode: 'add' })} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Add New Field</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field Label</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customFields.map(field => (
                                    <tr key={field.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.fieldLabel}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{field.fieldName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{field.fieldType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.isRequired ? 'Yes' : 'No'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setModalState({ isOpen: true, mode: 'edit', item: field })} className="text-green-600 hover:text-green-900">Edit</button>
                                            <button onClick={() => handleDelete(field)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {customFields.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">No custom fields defined yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Add/Edit */}
            {modalState.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSave} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">{modalState.mode === 'edit' ? 'Edit' : 'Add'} Custom Field</h2></div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label htmlFor="fieldLabel" className="block text-sm font-medium text-gray-700">Field Label</label>
                                <input id="fieldLabel" type="text" value={formState.fieldLabel} onChange={e => setFormState({ ...formState, fieldLabel: e.target.value })} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Soil Type" />
                            </div>
                            <div>
                                <label htmlFor="fieldName" className="block text-sm font-medium text-gray-700">Field Name (Programmatic)</label>
                                <input id="fieldName" type="text" value={formState.fieldName} onChange={e => setFormState({ ...formState, fieldName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} required disabled={modalState.mode === 'edit'} className="mt-1 w-full p-2 border border-gray-300 rounded-md font-mono disabled:bg-gray-100" placeholder="e.g., soil_type" />
                                <p className="text-xs text-gray-500 mt-1">Unique identifier. Lowercase letters, numbers, and underscores only. Cannot be changed after creation.</p>
                            </div>
                            <div>
                                <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">Field Type</label>
                                <CustomSelect
                                    value={formState.fieldType}
                                    onChange={value => setFormState({ ...formState, fieldType: value as CustomFieldType })}
                                    options={fieldTypeOptions}
                                />
                            </div>
                            {formState.fieldType === 'dropdown' && (
                                <div>
                                    <label htmlFor="options" className="block text-sm font-medium text-gray-700">Dropdown Options</label>
                                    <input id="options" type="text" value={formState.options} onChange={e => setFormState({ ...formState, options: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Alluvial, Clay, Loamy" />
                                    <p className="text-xs text-gray-500 mt-1">Enter comma-separated values.</p>
                                </div>
                            )}
                             <div className="flex items-center">
                                <input id="isRequired" type="checkbox" checked={formState.isRequired} onChange={e => setFormState({ ...formState, isRequired: e.target.checked })} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                                <label htmlFor="isRequired" className="ml-2 block text-sm text-gray-900">This field is required</label>
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={() => setModalState({ isOpen: false, mode: 'add' })} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Field</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SchemaManagerPage;
