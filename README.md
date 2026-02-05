# GhostForm 👻

**High-performance, Atomic, Framework-Agnostic Form Engine.**

> **Status**: Beta 🚧. API is stable but subject to minor changes.

GhostForm is designed to outperform traditional form libraries (like React Hook Form or Formik) in complex scenarios by separating form logic from the UI lifecycle. It uses a **"Ghost-like"** architecture (no Context Providers) and **Atomic** point-to-point updates (only the changing field re-renders).

## Key Features

- ⚛️ **Atomic Updates**: Only the field specifically subscribed to changes re-renders. No root re-renders.
- 🚀 **Performance**: Built on vanilla TS + `useSyncExternalStore` for concurrent features and zero tearing.
- 👻 **No Context**: pass the form object directly or via partial application. No `<FormProvider>` needed.
- 🛡️ **Type Safe**: Fully typed paths with dot-notation support (`user.profile.bio`).
- 🌳 **Tree Shakeable**: Zero dependencies in core.

## Installation

```bash
npm install ghost-form
# or
yarn add ghost-form
```

## Quick Start

### 1. Define your schema
```typescript
interface UserForm {
  user: {
    name: string;
    email: string;
  };
  age: number;
}
```

### 2. Create the form instance
You can create this outside your components, or inside a `useMemo`/`useRef`.

```typescript
import { createForm, createFormHooks } from 'ghost-form';

const form = createForm<UserForm>({
  initialValues: {
    user: { name: 'Alice', email: '' },
    age: 25
  }
});

// Create typed hooks for this specific form instance
const { useField, useWatch } = createFormHooks(form);
```

### 3. Build Components
Components are now "dumb" logic-wise and extremely performant.

```tsx
import React from 'react';

const NameInput = () => {
  // Only re-renders when "user.name" changes
  const { value, onChange, error } = useField('user.name');
  
  return (
    <div>
      <input 
        value={value as string} 
        onChange={onChange} 
        placeholder="Name" 
      />
      {error && <span>{error}</span>}
    </div>
  );
};

const AgeInput = () => {
  // Only re-renders when "age" changes
  const { value, onChange } = useField('age');
  
  return (
    <input 
      type="number" 
      value={value as number} 
      onChange={(e) => onChange(Number(e.target.value))} 
    />
  );
};

export const App = () => {
  return (
    <div>
      <h1>User Settings</h1>
      <NameInput />
      <AgeInput />
      
      <button onClick={() => console.log(form.getValues())}>
        Submit
      </button>
    </div>
  );
};
```

## API Reference

### `createForm<T>(config)`
Creates the vanilla form engine instance.
- `initialValues`: Deep object representing form state.

### `createFormHooks(form)`
Returns React hooks bound to the form instance:
- `useField(path)`: Returns `{ value, error, touched, onChange, onBlur }`.
- `useWatch(paths[])`: Returns array of values for conditional rendering.

### `form.setValue(path, value)`
Update logic from anywhere (even outside React components).

## License
MIT
