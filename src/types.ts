/**
 * Utility type to recursively find all dot-notation paths in an object.
 * Maximum depth limited to prevent TS errors on large objects.
 */
export type Path<T> = T extends object ? {
  [K in keyof T]: K extends string
    ? T[K] extends Record<string, any>
      ? K | `${K}.${Path<T[K]>}`
      : K
    : never
}[keyof T] : string;

/**
 * Type for the value at a specific path.
 */
export type PathValue<T, P extends Path<T> | string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]> | string
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : any;

export type FormValues = Record<string, any>;

/**
 * Storage interface for persistence plugins.
 */
export interface FormStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export type ValidationMode = 'all' | 'onBlur' | 'onChange' | 'onSubmit';

/**
 * Core configuration options.
 */
export interface FormConfig<TData extends Record<string, any>> {
  initialValues: TData;
  mode?: ValidationMode;
  validate?: (values: TData) => Record<string, string | undefined>;
  onSubmit?: (values: TData) => void | Promise<void>;
  onChange?: (values: TData) => void;
  storage?: FormStorage;
  storageKey?: string;
  preventFocusOnValidationError?: boolean;
}

/**
 * Represents the state of a single field.
 */
export interface FieldState<TValue = any> {
  value: TValue;
  error?: string | null;
  isTouched: boolean;
  isDirty: boolean;
  isValid: boolean;
}

/**
 * Global form statistics/status.
 */
export interface FormStatus {
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
  errors: Record<string, string | undefined>;
}
