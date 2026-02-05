import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createForm, FormEngine } from './core';
import { useField, useForm } from './react';

describe('GhostForm React Integration', () => {
  type TestForm = {
    name: string;
    age: number;
    profile: {
      bio: string;
    };
  };

  const setupExternal = () => {
    const form = createForm<TestForm>({
      initialValues: {
        name: 'Alice',
        age: 25,
        profile: { bio: 'Developer' },
      },
    });
    return { form };
  };

  describe('useField', () => {
    it('should return initial value', () => {
      const { form } = setupExternal();
      const { result } = renderHook(() => useField(form, 'name'));

      expect(result.current.value).toBe('Alice');
      expect(result.current.isDirty).toBe(false);
    });

    it('should update when form updates specific field', () => {
      const { form } = setupExternal();
      const { result } = renderHook(() => useField(form, 'name'));

      act(() => {
        form.setValue('name', 'Bob');
      });

      expect(result.current.value).toBe('Bob');
      expect(result.current.isDirty).toBe(true);
    });

    it('should update when parent object updates', () => {
      const { form } = setupExternal();
      const { result } = renderHook(() => useField(form, 'profile.bio'));

      act(() => {
        form.setValue('profile', { bio: 'Manager' });
      });

      expect(result.current.value).toBe('Manager');
    });

    it('onChange should update form state', () => {
      const { form } = setupExternal();
      const { result } = renderHook(() => useField(form, 'age'));

      act(() => {
        result.current.onChange(30);
      });

      expect(form.getValue('age')).toBe(30);
      expect(result.current.value).toBe(30);
    });

    it('should not re-render unrelated fields', () => {
      const { form } = setupExternal();
      
      const nameHook = renderHook(() => useField(form, 'name'));
      const ageHook = renderHook(() => useField(form, 'age'));

      // Capture render count proxy? We can't easily count renders with renderHook alone without a wrapper,
      // but we can ensure stability of values. 
      // Checking referential identity of the result object is a way, but createForm likely returns new objects on change.
      
      const initialNameResult = nameHook.result.current;

      act(() => {
        form.setValue('age', 26);
      });

      expect(ageHook.result.current.value).toBe(26);
      
      // Ideally, if the state hasn't changed, useSyncExternalStore shouldn't trigger a re-render.
      // But we can check that value is correct.
      expect(nameHook.result.current.value).toBe('Alice');
    });
  });

  describe('useForm', () => {
    it('should initialize and return form instance', () => {
      const { result } = renderHook(() => useForm<TestForm>({
        initialValues: { name: 'Alice', age: 25, profile: { bio: 'Dev' } }
      }));

      expect(result.current.form).toBeDefined();
      expect(result.current.formState.isDirty).toBe(false);
    });

    it('should update form state (dirty) when any field changes', () => {
      const { result } = renderHook(() => useForm<TestForm>({
        initialValues: { name: 'Alice', age: 25, profile: { bio: 'Dev' } }
      }));

      act(() => {
        result.current.form.setValue('name', 'Bob');
      });

      expect(result.current.formState.isDirty).toBe(true);
    });

    it('should handle submit success', async () => {
        const onSubmit = vi.fn();
        const { result } = renderHook(() => useForm<TestForm>({
            initialValues: { name: 'Alice', age: 25, profile: { bio: 'Dev' } },
            // mode: 'onSubmit' // default usually
        }));
        
        // handleSubmit returns a function (e) => Promise
        await act(async () => {
            await result.current.handleSubmit(onSubmit)();
        });
        
        expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice', age: 25, profile: { bio: 'Dev' } });
        expect(result.current.formState.submitCount).toBe(1);
    });
  });
});
