import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TaskModel, UserModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { Task, TaskStatus, TaskPriority, User } from '../types';
import CustomSelect from './CustomSelect';

interface TaskManagementPageProps {
    onBack: () => void;
    currentUser: User;
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

    return (
        <div
            onClick={onClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
            }}
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-4 ${isHighPriority ? 'border-red-500' : 'border-transparent'}`}
        >
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800 pr-4">{task.title}</h4>
                {assignee && <img src={assignee.avatar} alt={assignee.name} className="w-8 h-8 rounded-full flex-shrink-0" title={`Assigned to ${assignee.name}`} />}
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
        </div>
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
    const [formState, setFormState] = useState({
        title: '',
        description: '',
        status: TaskStatus.ToDo,
        priority: TaskPriority.Medium,
        dueDate: '',
        assigneeId: '',
        farmerId: '',
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
            });
        } else {
            setFormState({ title: '', description: '', status: TaskStatus.ToDo, priority: TaskPriority.Medium, dueDate: '', assigneeId: '', farmerId: '' });
        }
    }, [task, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            id: task?.id || `task_${Date.now()}`,
            ...formState,
            createdBy: task?.createdBy || currentUser.id,
            tenantId: task?.tenantId || currentUser.tenantId,
        };
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" name="title" value={formState.title} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" value={formState.description} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <CustomSelect value={formState.status} onChange={v => setFormState(s => ({...s, status: v as TaskStatus}))} options={Object.values(TaskStatus).map(s => ({value: s, label: s}))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Priority</label>
                            <CustomSelect value={formState.priority} onChange={v => setFormState(s => ({...s, priority: v as TaskPriority}))} options={Object.values(TaskPriority).map(p => ({value: p, label: p}))} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input type="date" name="dueDate" value={formState.dueDate} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Assign To</label>
                        <CustomSelect value={formState.assigneeId} onChange={v => setFormState(s => ({...s, assigneeId: v}))} options={[{value: '', label: 'Unassigned'}, ...userOptions]} placeholder="Select a user" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Related Farmer (Optional)</label>
                        <CustomSelect value={formState.farmerId} onChange={v => setFormState(s => ({...s, farmerId: v}))} options={[{value: '', label: 'None'}, ...farmerOptions]} placeholder="Select a farmer" />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Task</button>
                </div>
            </form>
        </div>
    );
};

// --- Main Page Component ---
const TaskManagementPage: React.FC<TaskManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    const tasks = useQuery(useMemo(() => database.get<TaskModel>('tasks').query(Q.sortBy('created_at', Q.desc)), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const [modalState, setModalState] = useState<{ isOpen: boolean; task?: TaskModel | null }>({ isOpen: false });

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
                    Object.assign(task, { ...taskData, syncStatusLocal: 'pending' });
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
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            await database.write(async () => {
                await task.update(t => {
                    t.status = newStatus;
                    t.syncStatusLocal = 'pending';
                });
            });
        }
        e.currentTarget.classList.remove('bg-green-100', 'border-green-400');
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                    </div>
                </div>
                
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