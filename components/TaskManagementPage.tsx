import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TaskModel, UserModel, FarmerModel, DirectiveModel, TenantModel, TerritoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { Task, TaskStatus, TaskPriority, User, DirectiveStatus, DirectiveTaskType } from '../types';
import CustomSelect from './CustomSelect';
import { Card, CardContent } from './ui/Card';

interface TaskManagementPageProps {
    onBack: () => void;
    currentUser: User;
    allDirectives: DirectiveModel[];
    allTenants: TenantModel[];
    allTerritories: TerritoryModel[];
}

// --- TaskCard Component ---
const TaskCard: React.FC<{
    task: TaskModel;
    assignee?: UserModel;
    onClick: () => void;
}> = ({ task, assignee, onClick }) => {
    const priorityClasses: Record<TaskPriority, string> = {
        [TaskPriority.Low]: 'bg-blue-500',
        [TaskPriority.Medium]: 'bg-yellow-500',
        [TaskPriority.High]: 'bg-red-500',
    };
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    const isHighPriority = task.priority === TaskPriority.High;
    const isGovtTask = task.source === 'GOVERNMENT';

    return (
        <Card
            onClick={onClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
            }}
            className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-4 border-l-4 ${isHighPriority ? 'border-red-500' : 'border-transparent'}`}
        >
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 pr-4">{task.title}</h4>
                    <div className="flex items-center gap-2">
                        {isGovtTask && (
                            <div title="Government Directive" className="p-1 bg-blue-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                            </div>
                        )}
                        {assignee && <img src={assignee.avatar} alt={assignee.name} className="w-8 h-8 rounded-full flex-shrink-0" title={`Assigned to ${assignee.name}`} />}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${priorityClasses[task.priority]}`} title={`Priority: ${task.priority}`}></span>
                         {task.dueDate && (
                            <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                                {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// --- TaskModal Component ---
const TaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: Omit<Task, 'createdAt' | 'updatedAt' | 'syncStatus'>, mode: 'create' | 'edit') => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
    task?: TaskModel | null;
    users: UserModel[];
    farmers: FarmerModel[];
    currentUser: User;
}> = ({ isOpen, onClose, onSave, onDelete, task, users, farmers, currentUser }) => {
    const isEditMode = !!task;
    const isGovtTask = task?.source === 'GOVERNMENT';
    const [formState, setFormState] = useState({
        title: '', description: '', status: TaskStatus.ToDo, priority: TaskPriority.Medium,
        dueDate: '', assigneeId: '', farmerId: '',
        completionNotes: '', completionPhoto: '',
    });

    useEffect(() => {
        if (task) {
            setFormState({
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                assigneeId: task.assigneeId || '',
                farmerId: task.farmerId || '',
                completionNotes: '', completionPhoto: '',
            });
        } else {
            setFormState({ title: '', description: '', status: TaskStatus.ToDo, priority: TaskPriority.Medium, dueDate: '', assigneeId: '', farmerId: '', completionNotes: '', completionPhoto: '' });
        }
    }, [task, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGovtTask && formState.status === TaskStatus.Done && (!formState.completionNotes || !formState.completionPhoto)) {
            alert("Completion notes and a photo are mandatory for Government Directives.");
            return;
        }

        const dataToSave: any = {
            id: task?.id || `task_${Date.now()}`,
            title: formState.title,
            description: formState.description,
            status: formState.status,
            priority: formState.priority,
            dueDate: formState.dueDate,
            assigneeId: formState.assigneeId,
            farmerId: formState.farmerId,
            createdBy: task?.createdBy || currentUser.id,
            tenantId: task?.tenantId || currentUser.tenantId,
            source: task?.source || 'INTERNAL',
            directiveId: task?.directiveId,
        };
        if (isGovtTask) {
            dataToSave.completionEvidenceJson = JSON.stringify({ notes: formState.completionNotes, photoUrl: formState.completionPhoto });
        }
        await onSave(dataToSave, isEditMode ? 'edit' : 'create');
    };
    
    const handleDelete = async () => {
        if (task && window.confirm('Are you sure you want to delete this task?')) {
            await onDelete(task.id);
        }
    }

    if (!isOpen) return null;
    
    const userOptions = users.map(u => ({ value: u.id, label: u.name }));
    const farmerOptions = farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})` }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Edit Task' : 'Create New Task'}</h2>
                    {isEditMode && (
                        <button type="button" onClick={handleDelete} className="text-sm font-semibold text-red-600 hover:underline">Delete Task</button>
                    )}
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    <input type="text" name="title" value={formState.title} onChange={handleChange} required className="text-lg font-semibold w-full p-2 border border-gray-300 rounded-md" placeholder="Task Title"/>
                    <textarea name="description" value={formState.description} onChange={handleChange} rows={4} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Description..."></textarea>
                    <div className="grid grid-cols-2 gap-4">
                        <CustomSelect label="Status" value={formState.status} onChange={v => setFormState(s => ({...s, status: v as TaskStatus}))} options={Object.values(TaskStatus).map(s => ({value: s, label: s}))} />
                        <CustomSelect label="Priority" value={formState.priority} onChange={v => setFormState(s => ({...s, priority: v as TaskPriority}))} options={Object.values(TaskPriority).map(p => ({value: p, label: p}))} />
                    </div>
                    <CustomSelect label="Assign To" value={formState.assigneeId} onChange={v => setFormState(s => ({...s, assigneeId: v}))} options={[{value: '', label: 'Unassigned'}, ...userOptions]} placeholder="Select a user" />
                    
                    {isGovtTask && formState.status === TaskStatus.Done && (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 space-y-4">
                            <h4 className="font-bold text-blue-800">Completion Evidence (Required)</h4>
                             <textarea name="completionNotes" value={formState.completionNotes} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Add completion notes..."></textarea>
                            <input type="text" name="completionPhoto" value={formState.completionPhoto} onChange={handleChange} placeholder="Paste image URL here..." className="w-full p-2 border border-gray-300 rounded-md" />
                            <p className="text-xs text-gray-500">Photo upload is mocked. Please paste a URL to an image.</p>
                        </div>
                    )}

                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Save Task</button>
                </div>
            </form>
        </div>
    );
};

// --- Main Page Component ---
const TaskManagementPage: React.FC<TaskManagementPageProps> = ({ onBack, currentUser, allDirectives, allTenants, allTerritories }) => {
    const database = useDatabase();
    
    const tasks = useQuery(useMemo(() => database.get<TaskModel>('tasks').query(Q.sortBy('created_at', Q.desc)), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const [modalState, setModalState] = useState<{ isOpen: boolean; task?: TaskModel | null }>({ isOpen: false });

    // --- Directives Logic ---
    const myTerritoryCodes = useMemo(() => allTerritories.filter(t => t.tenantId === currentUser.tenantId).map(t => t.administrativeCode), [allTerritories, currentUser]);
    const openDirectives = useMemo(() => allDirectives.filter(d => d.status === DirectiveStatus.Open && myTerritoryCodes.includes(d.administrativeCode)), [allDirectives, myTerritoryCodes]);
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    const handleClaimDirective = useCallback(async (directive: DirectiveModel) => {
        await database.write(async () => {
            const details = JSON.parse(directive.detailsJson);
            await database.get<TaskModel>('tasks').create(task => {
                task.title = `${directive.taskType}: ${directive.administrativeCode}`;
                task.description = details.instructions;
                task.status = TaskStatus.ToDo;
                task.priority = directive.priority as TaskPriority;
                task.dueDate = directive.dueDate;
                task.createdBy = currentUser.id;
                task.tenantId = currentUser.tenantId;
                task.source = 'GOVERNMENT';
                task.directiveId = directive.id;
                task.syncStatusLocal = 'pending';
            });

            // FIX: Cast 'directive' to 'any' to resolve issue with update method not being found on the type.
            await (directive as any).update(d => {
                d.status = DirectiveStatus.Claimed;
                d.claimedByTenantId = currentUser.tenantId;
                d.claimedAt = Date.now();
                d.syncStatusLocal = 'pending';
            });
        });
    }, [database, currentUser]);


    const handleSaveTask = useCallback(async (taskData: Omit<Task, 'createdAt' | 'updatedAt' | 'syncStatus'>, mode: 'create' | 'edit') => {
        await database.write(async () => {
            if (mode === 'edit') {
                const taskToUpdate = await database.get<TaskModel>('tasks').find(taskData.id);
                await taskToUpdate.update(task => {
                    Object.assign(task, { ...taskData, syncStatusLocal: 'pending' });
                });
            } else {
                await database.get<TaskModel>('tasks').create(task => {
                    task._raw.id = taskData.id;
                    Object.assign(task, { ...taskData, source: 'INTERNAL', syncStatusLocal: 'pending' });
                });
            }
        });
        setModalState({ isOpen: false });
    }, [database]);
    
    const handleDeleteTask = useCallback(async (taskId: string) => {
        await database.write(async () => {
            const taskToDelete = await database.get<TaskModel>('tasks').find(taskId);
            await taskToDelete.destroyPermanently();
        });
        setModalState({ isOpen: false });
    }, [database]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-green-100', 'border-green-400');
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            if (task.source === 'GOVERNMENT' && newStatus === TaskStatus.Done) {
                setModalState({ isOpen: true, task });
                return;
            }
            await database.write(async () => {
                await task.update(t => {
                    t.status = newStatus;
                    t.syncStatusLocal = 'pending';
                });
            });
        }
    }, [database, tasks]);

    const tasksByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, TaskModel[]> = {
            [TaskStatus.ToDo]: [],
            [TaskStatus.InProgress]: [],
            [TaskStatus.Done]: [],
        };
        tasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const columns = Object.values(TaskStatus).map(status => ({
        title: status,
        tasks: tasksByStatus[status],
    }));

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Task Management</h1>
                        <p className="text-gray-500">Organize and track your team's work.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setModalState({ isOpen: true })} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Add Task</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                {/* Open Directives Section */}
                {openDirectives.length > 0 && (
                     <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg shadow-md">
                        <h3 className="p-4 text-lg font-semibold text-blue-800 border-b">Open Directives from Government</h3>
                        <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                            {openDirectives.map(d => (
                                <div key={d.id} className="bg-white p-3 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{d.taskType} ({d.priority})</p>
                                        <p className="text-sm text-gray-600">Area: {d.administrativeCode}</p>
                                    </div>
                                    <button onClick={() => handleClaimDirective(d)} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-semibold">Claim</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {columns.map(column => (
                        <div key={column.title} className="bg-gray-100 rounded-lg">
                            <h3 className="p-4 text-lg font-semibold text-gray-700 border-b">{column.title} ({column.tasks.length})</h3>
                            <div
                                onDrop={(e) => handleDrop(e, column.title)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('bg-green-100', 'border-green-400');
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('bg-green-100', 'border-green-400');
                                }}
                                className="p-4 space-y-4 min-h-[50vh] transition-colors border-2 border-transparent rounded-b-lg"
                            >
                                {column.tasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        assignee={task.assigneeId ? userMap.get(task.assigneeId) : undefined}
                                        onClick={() => setModalState({ isOpen: true, task })}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <TaskModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false })}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                task={modalState.task}
                users={users}
                farmers={farmers}
                currentUser={currentUser}
            />
        </div>
    );
};

export default TaskManagementPage;
