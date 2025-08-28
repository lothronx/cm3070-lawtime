import React, { useState, useCallback, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { TaskWithClient } from '@/types';

export interface FormStateData {
  control: any;
  handleSubmit: any;
  errors: any;
  isSubmitting: boolean;
  isDirty: boolean;
  trigger: any;
  reset: any;
}

interface UseFormStateParams {
  onFormChange?: (formState: FormStateData) => void;
}

/**
 * Form state management hook
 * Responsibilities:
 * - Form state abstraction and forwarding
 * - Form validation coordination
 * - Parent component communication
 * - Form submission workflow
 */
export function useFormState({ onFormChange }: UseFormStateParams = {}) {
  const [formInstance, setFormInstance] = useState<UseFormReturn<TaskWithClient> | null>(null);

  // Register form instance from react-hook-form
  const registerForm = useCallback((form: UseFormReturn<TaskWithClient>) => {
    setFormInstance(form);
  }, []);

  // Memoized form state object
  const formState = useMemo(() => {
    if (!formInstance) return null;

    return {
      control: formInstance.control,
      handleSubmit: formInstance.handleSubmit,
      errors: formInstance.formState.errors,
      isSubmitting: formInstance.formState.isSubmitting,
      isDirty: formInstance.formState.isDirty,
      trigger: formInstance.trigger,
      reset: formInstance.reset,
    };
  }, [formInstance]);

  // Notify parent when form state changes
  React.useEffect(() => {
    if (formState) {
      onFormChange?.(formState);
    }
  }, [formState, onFormChange]);

  // Form validation and submission workflow
  const validateAndSubmit = useCallback(async (
    onSubmit: (data: TaskWithClient) => Promise<void>,
    onError: (message: string) => void
  ) => {
    if (!formState) {
      console.warn("Form state not available");
      return;
    }

    // Trigger validation on all fields
    const isValid = await formState.trigger();

    if (!isValid) {
      // Show first error message
      const firstError = Object.values(formState.errors)[0] as any;
      const errorMessage = firstError?.message || "Please fix the errors above";
      onError(errorMessage);
      return;
    }

    // If valid, submit the form
    formState.handleSubmit(onSubmit)();
  }, [formState]);

  return {
    formState,
    registerForm,
    validateAndSubmit,
    reset: formInstance?.reset,
  };
}

