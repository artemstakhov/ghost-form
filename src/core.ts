import {
    FormConfig,
    FieldState,
    FormStatus,
    Path,
    PathValue,
    FormStorage
} from './types';
import {
    deepClone,
    deepEqual,
    setByPathImmutable,
    getByPath,
    getParentPaths
} from './utils';

type Listener<T> = (state: T) => void;

export class FormEngine<T extends Record<string, any>> {
    // Main State
    private initialValues: T;
    private values: T;
    private fields = new Map<string, FieldState<any>>();
    private status: FormStatus = {
        isValid: true,
        isSubmitting: false,
        isValidating: false,
        isDirty: false,
        submitCount: 0,
        errors: {}
    };

    // Configuration
    private config: FormConfig<T>;
    private storage?: FormStorage;

    // Observers
    private listeners = new Set<Listener<FormEngine<T>>>();
    private fieldListeners = new Map<string, Set<Listener<FieldState<any>>>>();

    constructor(config: FormConfig<T>) {
        this.config = config;
        this.initialValues = deepClone(config.initialValues);
        this.values = deepClone(config.initialValues);
        this.storage = config.storage;

        // Initialize from storage if available
        this.loadFromStorage();

        // Initial validation - ONLY for 'all' mode or if explicitly requested.
        // For 'onChange' or 'onBlur', we normally want to start "fresh" without errors visible
        // unless initialValues are known to be dirty/invalid.
        if (this.config.mode === 'all') {
            this.validateAll();
        }
    }

    /**
     * ----------- State Accessors -----------
     */

    getValues(): T {
        return this.values;
    }

    getValue<P extends Path<T>>(path: P): PathValue<T, P> {
        return getByPath(this.values, path) as PathValue<T, P>;
    }

    getFieldState<P extends Path<T>>(path: P): FieldState<PathValue<T, P>> {
        if (!this.fields.has(path)) {
            // Initialize field state on demand
            const value = this.getValue(path);
            const initialValue = getByPath(this.initialValues, path);

            this.fields.set(path, {
                value,
                error: undefined,
                isDirty: !deepEqual(value, initialValue),
                isTouched: false,
                isValid: true
            });
        }
        return this.fields.get(path) as FieldState<PathValue<T, P>>;
    }

    getFormStatus(): FormStatus {
        return this.status;
    }

    /**
     * ----------- Actions -----------
     */

    setFullValues(newValues: T) {
        this.values = newValues;
        this.updateIsDirty();
        this.validateAll();
        // Notify form first so form-level listeners (hooks) get updated state
        this.notifyForm();
        this.saveToStorage();

        for (const path of this.fields.keys()) {
            this.notifyField(path);
        }
    }

    setValue<P extends Path<T>>(path: P, value: PathValue<T, P>) {
        const oldValue = getByPath(this.values, path);
        if (deepEqual(oldValue, value)) return;

        this.values = setByPathImmutable(this.values, path, value);

        // Sync existence of all tracked fields that might be affected
        for (const [fieldPath, fieldState] of this.fields.entries()) {
            if (fieldPath === path) continue;

            const currentVal = getByPath(this.values, fieldPath);
            if (currentVal !== fieldState.value) {
                const initialVal = getByPath(this.initialValues, fieldPath);
                this.fields.set(fieldPath, {
                    ...fieldState,
                    value: currentVal,
                    isDirty: !deepEqual(currentVal, initialVal)
                });
                this.notifyField(fieldPath);
            }
        }

        const field = this.getFieldState(path);
        const initialValue = getByPath(this.initialValues, path);

        const newFieldState: FieldState<any> = {
            ...field,
            value,
            isDirty: !deepEqual(value, initialValue),
        };

        this.fields.set(path, newFieldState);

        if (this.config.mode === 'onChange' || this.config.mode === 'all') {
            this.validateAll();
        }

        this.updateIsDirty();
        // Update status validity if needed
        const isValid = Object.keys(this.status.errors).length === 0;
        if (this.status.isValid !== isValid) {
            this.status = { ...this.status, isValid };
        }

        this.notifyField(path);
        this.notifyForm();

        // Parents and children are already notified in the loop above if their values changed
        // But getParentPaths ensures structural parents are notified even if not tracked yet? 
        // No, we only notify listeners. If nobody listens, we don't care.

        this.saveToStorage();
    }

    setBlur<P extends Path<T>>(path: P) {
        const field = this.getFieldState(path);
        if (field.isTouched) return;

        this.fields.set(path, { ...field, isTouched: true });

        if (this.config.mode === 'onBlur' || this.config.mode === 'all') {
            this.validateField(path);
        }

        this.notifyField(path);
        this.notifyForm();
    }

    reset(values?: Partial<T>) {
        this.initialValues = deepClone(values ? { ...this.initialValues, ...values } : this.initialValues);
        this.values = deepClone(this.initialValues);
        this.fields.clear();
        this.status = {
            isValid: true,
            isSubmitting: false,
            isValidating: false,
            isDirty: false,
            submitCount: 0,
            errors: {}
        };

        this.clearStorage();
        this.notifyForm();
    }

    async handleSubmit(onValid: (values: T) => Promise<void> | void, onInvalid?: (errors: Record<string, string | undefined>) => void) {
        try {
            this.status = { ...this.status, isSubmitting: true, submitCount: this.status.submitCount + 1 };
            this.notifyForm();

            // Touch all fields so errors become visible
            for (const path of this.fields.keys()) {
                const f = this.fields.get(path);
                if (f && !f.isTouched) {
                    this.fields.set(path, { ...f, isTouched: true });
                    this.notifyField(path);
                }
            }

            const isValid = this.validateAll();

            if (isValid) {
                await onValid(this.values);
            } else {
                if (onInvalid) onInvalid(this.status.errors);
            }
        } catch (e) {
            console.error("Form submission error", e);
        } finally {
            this.status = { ...this.status, isSubmitting: false };
            this.notifyForm();
        }
    }

    /**
     * ----------- Validation -----------
     */

    private validateField(path: string): boolean {
        if (this.config.onChange) {
            this.config.onChange(this.values);
        }

        const errors = this.config.validate ? this.config.validate(this.values) : {};

        const error = errors[path];
        const field = this.getFieldState(path as Path<T>);

        const isValid = !error;

        if (field.error !== error || field.isValid !== isValid) {
            this.fields.set(path, {
                ...field,
                error,
                isValid
            });

            const newErrors = { ...this.status.errors };
            if (error) {
                newErrors[path] = error;
            } else {
                delete newErrors[path];
            }

            const isFormValid = Object.keys(newErrors).length === 0;

            if (this.status.isValid !== isFormValid || !deepEqual(this.status.errors, newErrors)) {
                this.status = { ...this.status, errors: newErrors, isValid: isFormValid };
            }
        }

        return isValid;
    }

    private validateAll(): boolean {
        const errors = this.config.validate ? this.config.validate(this.values) : {};
        const isValid = Object.keys(errors).length === 0;

        if (!deepEqual(this.status.errors, errors) || this.status.isValid !== isValid) {
            this.status = { ...this.status, errors, isValid };
        }

        for (const [path, field] of this.fields.entries()) {
            const error = errors[path];
            if (field.error !== error) {
                this.fields.set(path, {
                    ...field,
                    error,
                    isValid: !error
                });
                this.notifyField(path);
            }
        }

        return this.status.isValid;
    }

    private updateIsDirty() {
        const isDirty = !deepEqual(this.values, this.initialValues);
        if (this.status.isDirty !== isDirty) {
            this.status = { ...this.status, isDirty };
        }
    }

    /**
     * ----------- Subscriptions -----------
     */

    subscribe(listener: Listener<FormEngine<T>>): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    subscribeToField<P extends Path<T>>(path: P, listener: Listener<FieldState<PathValue<T, P>>>): () => void {
        if (!this.fieldListeners.has(path)) {
            this.fieldListeners.set(path, new Set());
        }
        const set = this.fieldListeners.get(path)! as Set<Listener<FieldState<any>>>;
        set.add(listener);
        // Send immediate current state
        listener(this.getFieldState(path));

        return () => {
            set.delete(listener);
            if (set.size === 0) this.fieldListeners.delete(path);
        };
    }

    private notifyForm() {
        this.listeners.forEach(l => l(this));
    }

    private notifyField(path: string) {
        const set = this.fieldListeners.get(path);
        if (set) {
            const state = this.getFieldState(path as Path<T>);
            set.forEach(l => l(state));
        }
    }

    /**
     * ----------- Storage -----------
     */

    private async loadFromStorage() {
        if (!this.storage) return;
        try {
            const key = this.getStorageKey();
            const storedOrPromise = this.storage.getItem(key);

            const processStored = (stored: string | null) => {
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this.setFullValues({ ...this.initialValues, ...parsed });
                }
            };

            if (storedOrPromise instanceof Promise) {
                storedOrPromise.then(processStored).catch(e => console.warn("GhostForm: Failed to load from storage async", e));
            } else {
                processStored(storedOrPromise);
            }
        } catch (e) {
            console.warn("GhostForm: Failed to load from storage", e);
        }
    }

    private saveToStorage() {
        if (!this.storage) return;
        try {
            this.storage.setItem(this.getStorageKey(), JSON.stringify(this.values));
        } catch (e) {
            console.warn("GhostForm: Failed to save to storage", e);
        }
    }

    private clearStorage() {
        if (!this.storage) return;
        this.storage.removeItem(this.getStorageKey());
    }

    private getStorageKey() {
        return `ghost-form-${JSON.stringify(this.config.initialValues).length}`;
        // Rudimentary key, user should probably provide ID in config.
    }
}

export function createForm<T extends Record<string, any>>(config: FormConfig<T>) {
    return new FormEngine(config);
}
