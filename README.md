# GhostForm 👻

**High-performance, Atomic, Framework-Agnostic Form Engine.**

> **Status**: Production Ready ✅.

GhostForm is designed to outperform traditional form libraries in complex scenarios by separating form logic from the UI lifecycle. It uses a **"Ghost-like"** architecture (no Context Providers) and **Atomic** point-to-point updates (only the changing field re-renders).

## Key Features

- ⚛️ **Atomic Updates**: Only the field specifically subscribed to changes re-renders. No root re-renders.
- 🚀 **Performance**: Built on vanilla TS + `useSyncExternalStore`.
- 💾 **Persistence**: Built-in support for Sync/Async storage (localStorage, AsyncStorage, etc.).
- 🛡️ **Strict Types**: Deeply typed paths (`user.profile.bio`) and values.
- 🚂 **Lifecycle Control**: Granular `isDirty`, `isTouched`, `isSubmitting` tracking.
- 🔌 **Framework Agnostic Core**: Logic is separated from React bindings.

## Installation

```bash
npm install ghost-form
```

## Quick Start

### 1. Basic Usage

```tsx
import { useForm, useField } from 'ghost-form';

interface UserForm {
  name: string;
  age: number;
}

export const App = () => {
  const { form, handleSubmit, formState } = useForm<UserForm>({
    initialValues: { name: 'Alice', age: 25 },
    mode: 'onChange',
    onSubmit: async (values) => {
      console.log('Submitted:', values);
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <NameInput form={form} />
      
      <button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Saving...' : 'Submit'}
      </button>

      {/* Form-level dirty check without re-rendering inputs */}
      <div>Is Dirty: {formState.isDirty ? 'Yes' : 'No'}</div>
    </form>
  );
};

const NameInput = ({ form }) => {
  // Only re-renders when "name" changes
  const { value, onChange, onBlur, error } = useField(form, 'name');
  
  return (
    <div>
      <input 
        value={value} 
        onChange={onChange} 
        onBlur={onBlur}
      />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
};
```

## Advanced Features

### Validation Modes
Validate on `onChange`, `onBlur`, `onSubmit`, or `all`.

```typescript
useForm({
  initialValues: { ... },
  mode: 'onBlur', 
  validate: (values) => {
    const errors = {};
    if (values.age < 18) errors.age = 'Must be 18+';
    return errors;
  }
})
```

### Persistence (LocalStorage)
Automatically save and restore form state.

```typescript
useForm({
  initialValues: { ... },
  storage: window.localStorage,
  storageKey: 'user-settings-v1'
})
```

### React Native / Async Storage
Async storage is fully supported.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

useForm({
  initialValues: { ... },
  storage: AsyncStorage // Works out of the box
})
```

## API

### `useForm(config)`
Returns:
- `form`: The core engine instance.
- `formState`: Global status (`isValid`, `isDirty`, `isSubmitting`, `errors`, `submitCount`).
- `handleSubmit`: Wrapper for form submission.
- `reset`: Resets form to initial values.

### `useField(form, path)`
Returns:
- `value`: Current value (strictly typed).
- `onChange`: Change handler (accepts value or event).
- `onBlur`: Blur handler.
- `isDirty`, `isTouched`, `isValid`, `error`.

## License

MIT
