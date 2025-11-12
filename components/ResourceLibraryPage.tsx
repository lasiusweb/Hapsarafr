import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TrainingModuleModel, TrainingCompletionModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';
import TrainingModuleViewer from './TrainingModuleViewer';

interface ResourceLibraryPageProps {
    onBack: () => void;
    currentUser: User;
}

const ResourceLibraryPage: React.FC<ResourceLibraryPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    // Data queries
    const modules = useQuery(useMemo(() => database.get<TrainingModuleModel>('training_modules').query(Q.sortBy('sort_order', 'asc')), [database]));
    const completions = useQuery(useMemo(() => database.get<TrainingCompletionModel>('training_completions').query(Q.where('user_id', currentUser.id)), [database, currentUser.id]));
    
    const [selectedModule, setSelectedModule] = useState<TrainingModuleModel | null>(null);

    const completedModuleIds = useMemo(() => new Set(completions.map(c => c.moduleId)), [completions]);

    const handleMarkComplete = async () => {
        if (!selectedModule) return;
        
        await database.write(async () => {
            await database.get<TrainingCompletionModel>('training_completions').create(c => {
                c.userId = currentUser.id;
                c.moduleId = selectedModule.id;
                // Add other required fields if any, e.g., tenantId
            });
        });
        
        // Optimistically update UI
        completedModuleIds.add(selectedModule.id);
        setSelectedModule(null); // Close modal on completion
    };

    const modulesByCategory = useMemo(() => {
        return modules.reduce((acc, module) => {
            const category = module.category || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(module);
            return acc;
        }, {} as Record<string, TrainingModuleModel[]>);
    }, [modules]);
    
    const categoryOrder = ["Best Practices", "Fertilization", "Pest Control", "General"];

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Resource Library</h1>
                        <p className="text-gray-500">Access training materials, best practices, and video guides.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>
                
                <div className="space-y-8">
                    {categoryOrder.map(category => {
                        const categoryModules = modulesByCategory[category];
                        if (!categoryModules || categoryModules.length === 0) return null;

                        return (
                            <div key={category}>
                                <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-200">{category}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {categoryModules.map(module => {
                                        const isCompleted = completedModuleIds.has(module.id);
                                        return (
                                            <div key={module.id} onClick={() => setSelectedModule(module)} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer flex flex-col">
                                                <div className="p-6 flex-grow">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-lg text-gray-800 mb-2">{module.title}</h3>
                                                        {isCompleted && (
                                                            <div className="flex-shrink-0 ml-2" title="Completed">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                                                </div>
                                                <div className="px-6 pb-4 text-xs text-gray-500 flex justify-between items-center">
                                                    <span>{module.durationMinutes} min {module.moduleType}</span>
                                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                                        module.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                                        module.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>{module.difficulty}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedModule && (
                <TrainingModuleViewer
                    module={selectedModule}
                    isCompleted={completedModuleIds.has(selectedModule.id)}
                    onClose={() => setSelectedModule(null)}
                    onMarkComplete={handleMarkComplete}
                />
            )}
        </div>
    );
};

export default ResourceLibraryPage;
