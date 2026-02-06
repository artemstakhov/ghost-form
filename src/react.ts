"use client";

import { useSyncExternalStore, useCallback, useRef, ReactElement } from 'react';
import { FormEngine } from './core';
import { Path, PathValue, FormConfig, FieldState, FormStatus } from './types';

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

// Helper Types for Controller
interface ControllerRenderProps<TField = any> {
    onChange: (event: any) => void;
    onBlur: () => void;
    value: TField;
    name: string;
}

interface UseControllerReturn<TField = any> {
    field: ControllerRenderProps<TField>;
    fieldState: FieldState<TField>;
    formState: FormStatus;
}

/**
 * Controller component for easier integration with third-party UI libraries (MUI, AntD, React-Select, etc.)
 */
interface ControllerProps<T extends Record<string, any>, P extends Path<T>> {
    control: FormEngine<T>;
    name: P;
    render: (props: UseControllerReturn<PathValue<T, P>>) => ReactElement;
}

export function Controller<T extends Record<string, any>, P extends Path<T>>({ 
    control, 
    name, 
    render 
}: ControllerProps<T, P>) {
    const { value, onChange, onBlur, ...fieldState } = useField(control, name);
    // TODO: Ideally formState should also be passed, but constructing it might be expensive if subscribing to everything.
    // However, users expect formState in Controller.
    // For now, let's just pass basic field stuff. 
    // To get formState, we would need to subscribe to form updates too.
    
    // Let's create a partial implementation that satisfies standard needs
    const field = {
        onChange,
        onBlur,
        value,
        name: name as string
    };

    return render({
        field,
        fieldState: { ...fieldState, value }, // include value in fieldState too for consistency
        formState: control.getFormStatus() // Note: this might not be reactive if the component doesn't subscribe to form!
        // But Controller re-renders when useField re-renders (field changes).
        // If form status changes (e.g. isSubmitting) but field doesn't, this component might NOT re-render.
        // This is a trade-off. If they need formState, they should use useForm().formState.
    });
}
