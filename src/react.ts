import { useSyncExternalStore, useCallback } from 'react';
import { FormEngine, Path, FormConfig } from './core';

/**
 * Creates a Form instance.
 */
export function createForm<T extends Record<string, any>>(config?: FormConfig<T>) {
  return new FormEngine<T>(config);
}

/**
 * React hook to consume a specific field.
 * Triggers re-render ONLY when this specific field changes.
 */
export function useField<
  TData extends Record<string, any>,
  TValue = unknown
>(
  form: FormEngine<TData>,
  name: Path<TData> | string
) {
  const subscribe = useCallback(
    (callback: () => void) => {
      return form.subscribeField(name, () => callback());
    },
    [form, name]
  );

  const getSnapshot = () => {
    return form.getFieldState<TValue>(name);
  };

  const fieldState = useSyncExternalStore(subscribe, getSnapshot);

  const onChange = useCallback(
    (eventOrValue: React.ChangeEvent<any> | any) => {
      let newValue = eventOrValue;
      // Basic event handling support
      if (eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue) {
        const target = eventOrValue.target;
        if ('checked' in target && target.type === 'checkbox') {
          newValue = target.checked;
        } else if ('value' in target) {
          newValue = target.value;
        }
      }
      form.setValue(name, newValue);
    },
    [form, name]
  );

  const onBlur = useCallback(() => {
    form.setTouched(name, true);
  }, [form, name]);

  return {
    value: fieldState.value,
    error: fieldState.error,
    touched: fieldState.touched,
    dirty: fieldState.dirty,
    isValid: fieldState.isValid,
    onChange, // Standard handler that accepts events or values
    onBlur,
    setValue: onChange,
  };
}

/**
 * Hook to watch specific fields and return their values.
 * Useful for conditional logic in React components.
 */
export function useWatch<TData extends Record<string, any> = any>(
  form: FormEngine<TData>,
  names: (Path<TData> | string)[]
) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const unsubs = names.map(name => form.subscribeField(name, () => callback()));
      return () => unsubs.forEach(unsub => unsub());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, JSON.stringify(names)]
  );

  const getSnapshot = () => {
    return names.map(name => form.getValue(name));
  };
  
  const values = useSyncExternalStore(subscribe, getSnapshot);
  return values;
}

/**
 * Factory to create pre-bound hooks for a specific form instance.
 * Avoids passing the `form` object to every hook call.
 */
export function createFormHooks<TData extends Record<string, any>>(form: FormEngine<TData>) {
  return {
    useField: <TValue = unknown>(name: Path<TData> | string) => useField<TData, TValue>(form, name),
    useWatch: (names: (Path<TData> | string)[]) => useWatch(form, names),
    form,
  };
}
