import { getByPath, setByPath, deepEqual } from './utils';

/**
 * Utility type to recursively find all dot-notation paths in an object.
 */
export type Path<T> = T extends object ? {
  [K in keyof T]: K extends string
    ? T[K] extends Record<string, any>
      ? K | `${K}.${Path<T[K]>}`
      : K
    : never
}[keyof T] : string;

/**
 * Represents the state of a single field.
 */
export interface FieldState<TValue = unknown> {
  value: TValue;
  error?: string | null;
  touched: boolean;
  dirty: boolean;
  isValid: boolean;
}

/**
 * Type alias for form subscriber callback.
 */
export type FormSubscriber = (state: Record<string, FieldState>) => void;

/**
 * Type alias for specific field subscriber callback.
 */
export type FieldSubscriber = (state: FieldState) => void;

/**
 * Options for the FormEngine.
 */
export interface FormConfig<TData extends Record<string, any>> {
  initialValues?: TData;
  validate?: (values: TData) => Record<string, string | undefined> | Promise<Record<string, string | undefined>>;
}

/**
 * Core Form Engine.
 * Manages form state, validation, and subscriptions strictly in Vanilla TS.
 */
export class FormEngine<TData extends Record<string, any> = any> {
  private initialValues: TData;
  private currentValues: TData;
  
  // Field-level state map (atomic)
  private fields = new Map<string, FieldState>();
  
  // Subscribers
  private fieldSubscribers = new Map<string, Set<FieldSubscriber>>();
  private formSubscribers = new Set<FormSubscriber>();

  constructor(private config: FormConfig<TData> = {}) {
    this.initialValues = config.initialValues ? { ...config.initialValues } : ({} as TData);
    this.currentValues = { ...this.initialValues };
  }

  /**
   * Initializes a field if it doesn't exist.
   * Dynamic field registration logic.
   */
  private ensureField(path: string) {
    if (!this.fields.has(path)) {
      const initialValue = getByPath(this.initialValues, path);
      const currentValue = getByPath(this.currentValues, path);
      
      this.fields.set(path, {
        value: currentValue !== undefined ? currentValue : initialValue,
        error: null,
        touched: false,
        dirty: !deepEqual(initialValue, currentValue),
        isValid: true,
      });
    }
  }

  /**
   * Gets the full field state for a path.
   */
  getFieldState<TValue = unknown>(path: Path<TData> | string): FieldState<TValue> {
    this.ensureField(path);
    return this.fields.get(path)! as FieldState<TValue>;
  }

  /**
   * Updates a field's value and notifies specifically interested listeners.
   */
  setValue(path: Path<TData> | string, value: unknown) {
    this.ensureField(path);
    
    const field = this.fields.get(path)!;
    const previousValue = field.value;

    if (!deepEqual(previousValue, value)) {
      // Update values tree object (source of truth for full form value)
      setByPath(this.currentValues, path, value);
      
      const initialValue = getByPath(this.initialValues, path);
      
      // Update atomic field state
      field.value = value;
      field.dirty = !deepEqual(initialValue, value);
      
      // Notify field subscribers
      this.notifyField(path);
      
      // Notify form subscribers
      this.notifyForm();
    }
  }

  /**
   * Sets the touched state of a field.
   */
  setTouched(path: Path<TData> | string, touched: boolean = true) {
    this.ensureField(path);
    const field = this.fields.get(path)!;
    
    if (field.touched !== touched) {
      field.touched = touched;
      this.notifyField(path);
    }
  }

  /**
   * Sets the error state of a field.
   */
  setError(path: Path<TData> | string, error: string | null) {
    this.ensureField(path);
    const field = this.fields.get(path)!;
    
    if (field.error !== error) {
      field.error = error;
      field.isValid = !error;
      this.notifyField(path);
    }
  }

  /**
   * Get value from the values object.
   */
  getValue<TValue = unknown>(path: Path<TData> | string): TValue {
    return getByPath(this.currentValues, path) as TValue;
  }

  /**
   * Returns the entire form values object.
   */
  getValues(): TData {
    return this.currentValues;
  }

  /**
   * Subscribes a listener to a specific field's changes.
   * Returns an unsubscribe function.
   */
  subscribeField(path: Path<TData> | string, callback: FieldSubscriber): () => void {
    this.ensureField(path);
    
    if (!this.fieldSubscribers.has(path)) {
      this.fieldSubscribers.set(path, new Set());
    }
    
    this.fieldSubscribers.get(path)!.add(callback);
    
    // Call immediately with current state
    callback(this.getFieldState(path));

    return () => {
      const subs = this.fieldSubscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.fieldSubscribers.delete(path);
        }
      }
    };
  }

  /**
   * Subscribes to general form updates.
   */
  subscribeForm(callback: FormSubscriber): () => void {
    this.formSubscribers.add(callback);
    return () => {
      this.formSubscribers.delete(callback);
    };
  }

  private notifyField(path: string) {
    const field = this.fields.get(path);
    if (field) {
      const subscribers = this.fieldSubscribers.get(path);
      if (subscribers) {
        subscribers.forEach(cb => cb({ ...field })); // Send copy to prevent mutation
      }
    }
  }

  private notifyForm() {
    this.formSubscribers.forEach(cb => cb(Object.fromEntries(this.fields)));
  }
}
