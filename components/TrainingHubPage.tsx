import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, TrainingModuleModel, TrainingCompletionModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { Farmer, TrainingModule, User, ActivityType } from '../types';
import CustomSelect from './CustomSelect';
import TrainingModuleViewer from './TrainingModuleViewer';

interface TrainingHubPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const TrainingHubPage: React.FC<TrainingHubPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();

    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [selectedModule, setSelectedModule] = useState<TrainingModuleModel | null>(null);

    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const modules = useQuery(useMemo(() => database.get<TrainingModuleModel>('training_modules').query(Q.sortBy('created_at', 'asc')), [database]));
    
    const completionsQuery = useMemo(() => 
        selectedFarmerId 
            ? database.get<TrainingCompletionModel>('training_completions').query(Q.where('farmer_id', selectedFarmerId))
            : database.get<TrainingCompletionModel>('training_completions').query(Q.where('id', 'null')),
        [database, selectedFarmerId]
    );
    const completions = useQuery(completionsQuery);

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);
    const completedModuleIds = useMemo(() => new Set(completions.map(c => c.moduleId)), [completions]);

    const handleMarkComplete = useCallback(async (moduleId: string) => {
        if (!selectedFarmerId) {
            setNotification({ message: 'Please select a farmer first.', type: 'error'});
            return;
        }

        try {
            await database.write(async () => {
                await database.get<TrainingCompletionModel>('training_completions').create(c => {
                    c.farmerId = selectedFarmerId;
                    c.moduleId = moduleId;
                    c.completedAt = new Date();
                    c.completedByUserId = currentUser.id;
                    c.syncStatusLocal = 'pending';
                    c.tenantId = currentUser.tenantId;
                });
                 const module = modules.find(m => m.id === moduleId);
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = selectedFarmerId;
                    log.activityType = ActivityType.TRAINING_COMPLETED;
                    log.description = `Completed training module: "${module?.title || 'Unknown Module'}".`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Training marked as complete!', type: 'success'});
            setSelectedModule(null);
        } catch (error) {
            console.error('Failed to mark as complete:', error);
            setNotification({ message: 'Failed to save completion status.', type: 'error'});
        }
    }, [database, selectedFarmerId, currentUser, modules, setNotification]);

    const ModuleCard: React.FC<{ module: TrainingModuleModel }> = ({ module }) => {
        const isCompleted = completedModuleIds.has(module.id);
        const icon = module.moduleType === 'video' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-700" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /><path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-700" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" /><path d="M4 12a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" /></svg>
        );

        return (
            <div className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow ${isCompleted && selectedFarmerId ? 'opacity-60' : ''}`}>
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-3 rounded-full flex-shrink-0">{icon}</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800">{module.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{module.durationMinutes} min {module.moduleType}</p>
                        </div>
                        {isCompleted && selectedFarmerId && (
                            <div className="flex-shrink-0" title="Completed">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-4 h-20 overflow-hidden">{module.description}</p>
                    <button onClick={() => setSelectedModule(module)} className="mt-4 w-full text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">
                        {isCompleted && selectedFarmerId ? 'Review Content' : 'Start Learning'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Training Hub</h1>
                <p className="text-gray-500 mb-6">Empower farmers with essential knowledge and best practices.</p>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6 sticky top-4 z-10">
                    <CustomSelect 
                        label="View progress for farmer:"
                        options={farmerOptions}
                        value={selectedFarmerId}
                        onChange={setSelectedFarmerId}
                        placeholder="-- Select a Farmer to Track Progress --"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map(module => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>

                {selectedModule && (
                    <TrainingModuleViewer
                        module={selectedModule}
                        isCompleted={completedModuleIds.has(selectedModule.id)}
                        onClose={() => setSelectedModule(null)}
                        onMarkComplete={() => handleMarkComplete(selectedModule.id)}
                    />
                )}
            </div>
        </div>
    );
};

export default TrainingHubPage;