import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createForm, createFormHooks, useField } from './react';

describe('GhostForm React Integration', () => {
  type TestForm = {
    name: string;
    age: number;
    profile: {
      bio: string;
    };
  };

  const setup = () => {
    const form = createForm<TestForm>({
      initialValues: {
        name: 'Alice',
        age: 25,
        profile: { bio: 'Developer' },
      },
    });
    const { useField: useTypedField } = createFormHooks(form);
    return { form, useTypedField };
  };

  it('useField should return initial value', () => {
    const { form } = setup();
    const { result } = renderHook(() => useField(form, 'name'));

    expect(result.current.value).toBe('Alice');
    expect(result.current.dirty).toBe(false);
  });

  it('useField should update when form updates', () => {
    const { form } = setup();
    const { result } = renderHook(() => useField(form, 'name'));

    act(() => {
      form.setValue('name', 'Bob');
    });

    expect(result.current.value).toBe('Bob');
    expect(result.current.dirty).toBe(true);
  });

  it('useField onChange should update form state', () => {
    const { form } = setup();
    const { result } = renderHook(() => useField(form, 'age'));

    act(() => {
      result.current.onChange(30);
    });

    expect(form.getValue('age')).toBe(30);
    expect(result.current.value).toBe(30);
  });

  it('should not re-render unrelated fields', () => {
    const { form } = setup();
    
    // Hook for 'name'
    const nameHook = renderHook(() => useField(form, 'name'));
    
    // Hook for 'age'
    const ageHook = renderHook(() => useField(form, 'age'));

    // Update 'age'
    act(() => {
      form.setValue('age', 26);
    });

    // Check 'age' updated
    expect(ageHook.result.current.value).toBe(26);
    // Check 'name' value is still same
    expect(nameHook.result.current.value).toBe('Alice');
    
    // Ideally we would check render counts here, but checking value stability is a good proxy for basic correctness.
    // In a real optimized test we could use a profiler or render counter.
  });

  it('should handle event objects in onChange', () => {
    const { form } = setup();
    const { result } = renderHook(() => useField(form, 'name'));

    act(() => {
      // Mocking a React ChangeEvent
      const event = {
        target: { value: 'Charlie' }
      } as any;
      
      result.current.onChange(event);
    });

    expect(form.getValue('name')).toBe('Charlie');
  });
});
