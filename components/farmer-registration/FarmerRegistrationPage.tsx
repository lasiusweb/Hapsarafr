import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { farmerSchema, FarmerFormData, farmerDefaults, stepSchemas } from '../../lib/schemas/farmerSchema';
import { mapFarmerFormToDBRecord } from '../../lib/farmerMapper';
import { FormProgress } from './FormProgress';
import { StepPersonal } from './StepPersonal';
import { StepIdentity } from './StepIdentity';
import { StepLocation } from './StepLocation';
import { StepBank } from './StepBank';
import { StepFarm } from './StepFarm';
import { StepMedia } from './StepMedia';
import { User } from '../../types';
import { useDatabase } from '../../DatabaseContext';
import { Q } from '@nozbe/watermelondb';

const TOTAL_STEPS = 6;

interface FarmerRegistrationPageProps {
  userId?: string;
  currentUser?: User | null;
  onSuccess?: (data: FarmerFormData) => void;
  onCancel?: () => void;
}

export function FarmerRegistrationPage({ userId, currentUser, onSuccess, onCancel }: FarmerRegistrationPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<FarmerFormData | null>(null);
  
  const database = useDatabase();
  const effectiveUserId = userId || currentUser?.id || 'default';

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FarmerFormData>({
    resolver: zodResolver(farmerSchema),
    defaultValues: farmerDefaults,
    mode: 'onBlur',
  });

  const formValues = watch();

  useEffect(() => {
    const saved = localStorage.getItem(`farmer_draft_${effectiveUserId}`);
    if (saved) {
      try {
        const { data } = JSON.parse(saved);
        setDraftData(data);
        setShowDraftModal(true);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, [effectiveUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(`farmer_draft_${effectiveUserId}`, JSON.stringify({ data: formValues, savedAt: Date.now() }));
    }, 30000);
    return () => clearInterval(interval);
  }, [effectiveUserId, formValues]);

  const handleRestoreDraft = () => {
    if (draftData) {
      reset(draftData);
    }
    setShowDraftModal(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(`farmer_draft_${effectiveUserId}`);
    setShowDraftModal(false);
  };

  const checkAadhaarDuplicate = useCallback(async (aadhaar: string): Promise<boolean> => {
    try {
      const farmers = await database.get('farmers').query(
        Q.where('aadhaar_number', aadhaar)
      ).fetch();
      return farmers.length > 0;
    } catch (error) {
      console.error('Error checking aadhaar:', error);
      return false;
    }
  }, [database]);

  const goToNextStep = async () => {
    const stepKey = currentStep as keyof typeof stepSchemas;
    
    if (currentStep === 2) {
      const aadhaar = watch('aadhaarNumber');
      if (aadhaar) {
        const isDuplicate = await checkAadhaarDuplicate(aadhaar);
        if (isDuplicate) {
          alert('Aadhaar number already exists in the system');
          return;
        }
      }
    }
    
    const isValid = await trigger(Object.keys(stepSchemas[stepKey].shape) as (keyof FarmerFormData)[]);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: FarmerFormData) => {
    setIsSubmitting(true);
    try {
      const dbRecord = mapFarmerFormToDBRecord(data, effectiveUserId, currentUser?.tenantId || 'default-tenant');
      
      await database.write(async () => {
        await database.get('farmers').create((farmer: any) => {
          Object.keys(dbRecord).forEach((key) => {
            farmer[key] = dbRecord[key];
          });
        });
      });
      
      localStorage.removeItem(`farmer_draft_${effectiveUserId}`);
      alert('Farmer registered successfully!');
      onSuccess?.(data);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to register farmer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepPersonal register={register} errors={errors} />;
      case 2:
        return <StepIdentity register={register} errors={errors} />;
      case 3:
        return <StepLocation register={register} errors={errors} watch={watch} setValue={setValue} />;
      case 4:
        return <StepBank register={register} errors={errors} watch={watch} setValue={setValue} />;
      case 5:
        return <StepFarm register={register} errors={errors} watch={watch} setValue={setValue} />;
      case 6:
        return <StepMedia register={register} errors={errors} watch={watch} setValue={setValue} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Register New Farmer</h1>
      
      <FormProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderStep()}

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPrevStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Previous
              </button>
            )}

            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </form>

      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Draft Found</h3>
            <p className="text-gray-600 mb-4">You have an unsaved draft. Would you like to restore it?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDiscardDraft}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Discard
              </button>
              <button
                onClick={handleRestoreDraft}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmerRegistrationPage;