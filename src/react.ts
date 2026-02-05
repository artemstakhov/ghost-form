"use client";

import { useSyncExternalStore, useCallback, useRef } from 'react';
import { FormEngine } from './core';
import { Path, PathValue, FormConfig } from './types';

export function useForm<T extends Record<string, any>>(config: FormConfig<T>) {
  // We use a ref to hold the form engine to ensure it persists across renders
  // but is lazily initialized.
  const formRef = useRef<FormEngine<T> | null>(null);
  
  if (!formRef.current) {
    formRef.current = new FormEngine(config);
  }

  const form = formRef.current;

  // Subscribe to whole form changes (submit/reset/etc)
  const subscribe = useCallback(
    (callback: () => void) => form.subscribe(() => callback()),
    [form]
  );
  
  const getSnapshot = () => form.getFormStatus();
  
  const formState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    form,
    formState, // e.g. .isSubmitting, .isValid
    register: (name: Path<T>) => {
      return { name };
    },
    handleSubmit: (
      onValid: (values: T) => Promise<void> | void, 
      onInvalid?: (errors: Record<string, string | undefined>) => void
    ) => async (e?: React.BaseSyntheticEvent) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        await form.handleSubmit(onValid, onInvalid);
    },
    reset: form.reset.bind(form)
  };
}

export function useField<T extends Record<string, any>, P extends Path<T>>(
  form: FormEngine<T>,
  name: P
) {
  const subscribe = useCallback(
    (callback: () => void) => {
      return form.subscribeToField(name, () => callback());
    },
    [form, name]
  );

  const getSnapshot = () => {
    return form.getFieldState(name);
  };
  
  const getServerSnapshot = () => {
      return form.getFieldState(name);
  };

  const fieldState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const onChange = useCallback(
    (eventOrValue: any) => {
      let newValue = eventOrValue;
      if (
        eventOrValue && 
        typeof eventOrValue === 'object' && 
        'target' in eventOrValue
      ) {
        const target = eventOrValue.target;
        if (target.type === 'checkbox') {
          newValue = target.checked;
        } else {
          newValue = target.value;
        }
      }
      form.setValue(name, newValue as PathValue<T, P>);
    },
    [form, name]
  );

  const onBlur = useCallback(() => {
    form.setBlur(name);
  }, [form, name]);

  return {
    ...fieldState,
    onChange, // can be passed to <input onChange>
    onBlur,   // can be passed to <input onBlur>
    value: fieldState.value
  };
}
