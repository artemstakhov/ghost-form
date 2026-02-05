import { describe, it, expect, vi } from 'vitest';
import { FormEngine } from './core';

describe('FormEngine (Core)', () => {
  it('should initialize with default values', () => {
    const form = new FormEngine({
      initialValues: { name: 'Alice', age: 25 },
    });

    expect(form.getValues()).toEqual({ name: 'Alice', age: 25 });
    expect(form.getValue('name')).toBe('Alice');
    expect(form.getFieldState('name').value).toBe('Alice');
  });

  it('should update values and notify subscribers', () => {
    const form = new FormEngine({
      initialValues: { user: { name: 'Alice' } },
    });

    const subscriber = vi.fn();
    form.subscribeField('user.name', subscriber);

    form.setValue('user.name', 'Bob');

    expect(form.getValue('user.name')).toBe('Bob');
    expect(form.getFieldState('user.name').dirty).toBe(true);
    expect(subscriber).toHaveBeenCalledTimes(2); // 1. Initial subscription, 2. Update
    expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: 'Bob' }));
  });

  it('should handle deep nesting', () => {
    const form = new FormEngine({
      initialValues: { a: { b: { c: 1 } } },
    });

    form.setValue('a.b.c', 2);
    expect(form.getValues()).toEqual({ a: { b: { c: 2 } } });
  });

  it('should track touched state', () => {
    const form = new FormEngine({ initialValues: { name: '' } });
    
    expect(form.getFieldState('name').touched).toBe(false);
    
    form.setTouched('name', true);
    expect(form.getFieldState('name').touched).toBe(true);
  });
});
