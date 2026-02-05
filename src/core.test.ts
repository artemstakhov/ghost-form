import { describe, it, expect, vi } from 'vitest';
import { FormEngine } from './core';
import { FormStorage } from './types';

describe('FormEngine (Core)', () => {
  it('should initialize with default values', () => {
    const form = new FormEngine({
      initialValues: { name: 'Alice', age: 25 },
    });

    expect(form.getValues()).toEqual({ name: 'Alice', age: 25 });
    expect(form.getValue('name')).toBe('Alice');
    expect(form.getFieldState('name').value).toBe('Alice');
  });

  describe('Values & Atomic Updates', () => {
    it('should update values and notify subscribers', () => {
      const form = new FormEngine({
        initialValues: { user: { name: 'Alice' } },
      });

      const subscriber = vi.fn();
      form.subscribeToField('user.name', subscriber);

      form.setValue('user.name', 'Bob');

      expect(form.getValue('user.name')).toBe('Bob');
      expect(form.getFieldState('user.name').isDirty).toBe(true);
      expect(subscriber).toHaveBeenCalledTimes(2); // Initial (1) + Update (2)
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: 'Bob' }));
    });

    it('should not notify if value is identical', () => {
      const form = new FormEngine({
        initialValues: { name: 'Alice' },
      });
      const subscriber = vi.fn();
      form.subscribeToField('name', subscriber);

      form.setValue('name', 'Alice');
      expect(subscriber).toHaveBeenCalledTimes(1); // Only initial
    });

    it('should handle deep nesting', () => {
      const form = new FormEngine({
        initialValues: { a: { b: { c: 1 } } },
      });

      form.setValue('a.b.c', 2);
      expect(form.getValues()).toEqual({ a: { b: { c: 2 } } });
      expect(form.getFieldState('a.b.c').value).toBe(2);
    });
  });

  describe('Parent/Child Synchronization', () => {
    it('should update parent field state when child changes', () => {
      const form = new FormEngine({
        initialValues: { user: { name: 'Alice', age: 30 } },
      });

      const parentSubscriber = vi.fn();
      form.subscribeToField('user', parentSubscriber);

      form.setValue('user.name', 'Bob');

      // Parent value should reflect the change
      expect(form.getValue('user')).toEqual({ name: 'Bob', age: 30 });
      // Parent state should be updated
      expect(parentSubscriber).toHaveBeenCalledTimes(2);
      expect(form.getFieldState('user').isDirty).toBe(true);
    });

    it('should update child field state when parent changes', () => {
      const form = new FormEngine({
        initialValues: { user: { name: 'Alice', age: 30 } },
      });

      const childSubscriber = vi.fn();
      form.subscribeToField('user.name', childSubscriber);

      form.setValue('user', { name: 'Bob', age: 31 });

      // Child value should reflect the change
      expect(form.getValue('user.name')).toBe('Bob');
      // Child state should be updated
      expect(childSubscriber).toHaveBeenCalledTimes(2);
      expect(form.getFieldState('user.name').value).toBe('Bob');
      expect(form.getFieldState('user.name').isDirty).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate on change (mode: onChange)', () => {
      const form = new FormEngine({
        initialValues: { age: 10 },
        mode: 'onChange',
        validate: (values) => values.age < 18 ? { age: 'Too young' } : {},
      });

      form.setValue('age', 12);
      expect(form.getFormStatus().isValid).toBe(false);
      expect(form.getFormStatus().errors.age).toBe('Too young');
      expect(form.getFieldState('age').error).toBe('Too young');
      expect(form.getFieldState('age').isValid).toBe(false);

      form.setValue('age', 20);
      expect(form.getFormStatus().isValid).toBe(true);
      expect(form.getFormStatus().errors.age).toBeUndefined();
    });

    it('should validate on blur (mode: onBlur)', () => {
      const form = new FormEngine({
        initialValues: { age: 10 },
        mode: 'onBlur',
        validate: (values) => values.age < 18 ? { age: 'Too young' } : {},
      });

      form.setValue('age', 12);
      // Should NOT be invalid yet
      expect(form.getFieldState('age').error).toBeUndefined();

      form.setBlur('age');
      // Should NOW be invalid
      expect(form.getFieldState('age').error).toBe('Too young');
    });
  });

  describe('Lifecycle & Reset', () => {
    it('should track isDirty form-level', () => {
      const form = new FormEngine({ initialValues: { name: 'Alice' } });
      expect(form.getFormStatus().isDirty).toBe(false);

      form.setValue('name', 'Bob');
      expect(form.getFormStatus().isDirty).toBe(true);

      form.setValue('name', 'Alice');
      expect(form.getFormStatus().isDirty).toBe(false);
    });

    it('should track touched state via blur', () => {
      const form = new FormEngine({ initialValues: { name: '' } });
      expect(form.getFieldState('name').isTouched).toBe(false);
      
      form.setBlur('name');
      expect(form.getFieldState('name').isTouched).toBe(true);
    });

    it('should reset form to initial', () => {
      const form = new FormEngine({ initialValues: { name: 'Alice' } });
      form.setValue('name', 'Bob');
      form.setBlur('name');
      
      expect(form.getFormStatus().isDirty).toBe(true);
      
      form.reset();
      
      expect(form.getValues()).toEqual({ name: 'Alice' });
      expect(form.getFormStatus().isDirty).toBe(false);
      // Note: Fields map is cleared on reset, so getting state again creates fresh clean state
      expect(form.getFieldState('name').isTouched).toBe(false);
    });

    it('should reset with new values', () => {
      const form = new FormEngine({ initialValues: { name: 'Alice' } });
      form.reset({ name: 'Charlie' });
      
      expect(form.getValues()).toEqual({ name: 'Charlie' });
      expect(form.getFormStatus().isDirty).toBe(false); // Clean because initialValues updated
    });
  });

  describe('Storage', () => {
    it('should load initial values from storage', () => {
      const mockStorage: FormStorage = {
        getItem: vi.fn(() => JSON.stringify({ name: 'Stored Name' })),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      const form = new FormEngine({
        initialValues: { name: 'Alice' },
        storage: mockStorage,
        storageKey: 'test-form'
      });

      // Since storage load might be async/sync, check immediate or wait
      // Implementation tries sync first if returns string
      expect(form.getValues().name).toBe('Stored Name');
      expect(form.getFormStatus().isDirty).toBe(true); // Dirty because different from code-initial
    });

    it('should save to storage on change', () => {
        const mockStorage: FormStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        };

        const form = new FormEngine({
            initialValues: { name: 'Alice' },
            storage: mockStorage
        });

        form.setValue('name', 'Bob');
        expect(mockStorage.setItem).toHaveBeenCalledWith(expect.any(String), JSON.stringify({ name: 'Bob' }));
    });
  });

  describe('Deep Cloning', () => {
      it('should isolate internal state from external mutations', () => {
          const initial = { user: { name: 'Alice' } };
          const form = new FormEngine({ initialValues: initial });
          
          // Mutate external object
          initial.user.name = 'Mutated';
          
          expect(form.getValues().user.name).toBe('Alice');
      });
  });
});
