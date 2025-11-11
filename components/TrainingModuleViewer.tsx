import React from 'react';
import { TrainingModuleModel } from '../db';
import { sanitizeHTML } from '../lib/utils';

interface TrainingModuleViewerProps {
    module: TrainingModuleModel;
    isCompleted: boolean;
    onClose: () => void;
    onMarkComplete: () => void;
}

const TrainingModuleViewer: React.FC<TrainingModuleViewerProps> = ({ module, isCompleted, onClose, onMarkComplete }) => {

    const renderContent = () => {
        if (module.moduleType === 'video') {
            return (
                <div className="aspect-w-16 aspect-h-9">
                    <iframe 
                        src={module.content} 
                        title={module.title}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </div>
            );
        }
        if (module.moduleType === 'article') {
            return (
                <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(module.content) }} 
                />
            );
        }
        return <p>Unsupported module type.</p>;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{module.title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{module.durationMinutes} min {module.moduleType}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-8 overflow-y-auto flex-1">
                    {renderContent()}
                </div>
                <div className="bg-gray-100 p-4 flex justify-between items-center rounded-b-lg">
                    {isCompleted ? (
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Completed
                        </div>
                    ) : (
                         <div/> // Placeholder for alignment
                    )}
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                        {!isCompleted && (
                            <button type="button" onClick={onMarkComplete} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                                Mark as Complete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingModuleViewer;
