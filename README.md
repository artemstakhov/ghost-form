# GhostForm 👻

**High-performance, Atomic, Framework-Agnostic Form Engine.**

[![npm version](https://img.shields.io/npm/v/@artemstakhov/ghost-form.svg)](https://www.npmjs.com/package/@artemstakhov/ghost-form)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GhostForm is designed to outperform traditional form libraries in complex scenarios by separating form logic from the UI lifecycle. It uses a **"Ghost-like"** architecture (no Context Providers) and **Atomic** point-to-point updates (only the changing field re-renders).

## Key Features

- ⚛️ **Atomic Updates**: Only the field specifically subscribed to changes re-renders. No root re-renders.
- 🚀 **Performance**: Built on vanilla TS + `useSyncExternalStore`.
- 💾 **Persistence**: Built-in support for Sync/Async storage (localStorage, AsyncStorage, etc.).
- 🛡️ **Strict Types**: Deeply typed paths (`user.profile.bio`) and values.
- 🔌 **Framework Agnostic Core**: Logic is separated from React bindings.
- 🎮 **Controller Support**: Easy integration with third-party libraries (MUI, Shadcn UI, etc).

## Installation

```bash
npm install @artemstakhov/ghost-form
```

## Quick Start

### 1. Basic Usage with `GhostInput` Pattern

The most performant way to use GhostForm is by creating a wrapper component for your inputs. This ensures only that specific input re-renders when typed into.

```tsx
import { useForm, useField, FormEngine } from '@artemstakhov/ghost-form';

// 1. Create a Reusable Field Wrapper
const Input = ({ form, name, label }: { form: FormEngine<any>, name: string, label: string }) => {
  // useField subscribes ONLY to this field's changes
  const { value, onChange, onBlur, error, isTouched } = useField(form, name);

  return (
    <div className="mb-4">
      <label>{label}</label>
      <input
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        className={error && isTouched ? 'error' : ''}
      />
      {error && isTouched && <span className="text-red-500">{error}</span>}
    </div>
  );
};

// 2. Use it in your form
export const App = () => {
  const { form, handleSubmit } = useForm({
    initialValues: { name: 'Alice', email: '' },
    validate: (values) => {
      const errors: any = {};
      if (!values.name) errors.name = 'Required';
      if (!values.email.includes('@')) errors.email = 'Invalid email';
      return errors;
    }
  });

  const onSubmit = (data) => console.log('Submitted:', data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input form={form} name="name" label="Name" />
      <Input form={form} name="email" label="Email" />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### 2. Using `Controller` (Third-party integrations)

For complex components like Select, DatePicker, or PhoneInputs that don't expose a simple `onChange(e)` event, use the `<Controller />` component.

```tsx
import { Controller } from '@artemstakhov/ghost-form';
import PhoneInput from 'react-phone-number-input';

<Controller
  control={form}
  name="phone"
  render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
    <div>
      <PhoneInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
      {error && <span>{error}</span>}
    </div>
  )}
/>
```

## API Reference

### `useForm<T>(config)`

Initializes the form engine.

**Config:**
- `initialValues`: Initial state object.
- `mode`: Validation mode (`'onChange' | 'onBlur' | 'all'`).
- `validate`: Synchronous validation function returning an error object.
- `storage`: Optional persistence configuration.

**Returns:**
- `form`: The `FormEngine` instance (pass this to fields).
- `formState`: Reactive object containing `isValid`, `isSubmitting`, `isDirty`, etc.
- `handleSubmit`: Wrapper for form submission.
- `reset`: Function to reset form to initial values.

### `useField(form, name)`

Hook to subscribe a component to a specific field.

**Returns:**
- `value`: Current value.
- `onChange`: Handler for HTML inputs or direct values.
- `onBlur`: Blur handler.
- `error`: Error message string (if any).
- `isTouched`: Boolean indicating if field has been touched.
- `isDirty`: Boolean indicating if value differs from initial.

### `Controller`

Component wrapper for integrating uncontrolled components or complex UI libraries.

**Props:**
- `control`: The `form` instance returned from `useForm`.
- `name`: Path to the field value.
- `render`: Render prop receiving `field` (onChange, onBlur, value) and `fieldState`.

## Advanced: Dynamic Validation

You can update validation logic on the fly. This is useful for dynamic fields where the schema changes based on user interaction.

```tsx
const { form } = useForm({
  initialValues: {},
  validate: (values) => {
    // This function will re-run whenever this component renders 
    // ensuring it catches closure variables (like dynamic field lists)
    const errors = {};
    dynamicFields.forEach(field => {
        if(!values[field.id]) errors[field.id] = "Required";
    });
    return errors;
  }
});
```

## License

MIT © [Artem Stakhov](https://github.com/artemstakhov)
