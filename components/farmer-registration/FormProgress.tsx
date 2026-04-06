import React from 'react';

interface FormProgressProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

const defaultLabels = ['Personal', 'Identity', 'Location', 'Bank', 'Farm', 'Media'];

export function FormProgress({ currentStep, totalSteps = 6, labels = defaultLabels }: FormProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {labels.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={`mt-1 text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
              {index < totalSteps - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}