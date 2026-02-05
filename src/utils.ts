/**
 * Retrieves a value from an object using a dot-notation path.
 */
export function getByPath(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!path || !obj) return undefined;
  const keys = path.split('.');
  let result: any = obj;
  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    result = result[key];
  }
  return result;
}

/**
 * Sets a value in an object using a dot-notation path IMMUTABLY.
 * Returns a new object reference if changes were made.
 */
export function setByPathImmutable<T extends Record<string, any>>(obj: T, path: string, value: unknown): T {
  if (!path) return value as any;
  const keys = path.split('.');
  
  // Recursive helper to clone and update
  const update = (current: any, index: number): any => {
    const key = keys[index];
    const isLast = index === keys.length - 1;

    if (isLast) {
      if (current && current[key] === value) return current; // No change
      
      // If array
      if (Array.isArray(current)) {
        const copy = [...current];
        copy[Number(key)] = value;
        return copy;
      }
      
      // If object or null/undefined
      return { ...current, [key]: value };
    }

    // Traverse deeper
    const nextCurrent = (current && current[key]) ? current[key] : (isNaN(Number(keys[index + 1])) ? {} : []);
    const updatedNext = update(nextCurrent, index + 1);

    if (current && current[key] === updatedNext) return current; // No change in child

    if (Array.isArray(current)) {
      const copy = [...current];
      copy[Number(key)] = updatedNext;
      return copy;
    }

    return { ...current, [key]: updatedNext };
  };

  return update(obj, 0);
}

/**
 * Deep equality check for two values.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;
    
    if (Array.isArray(a)) {
      const arrA = a as unknown[];
      const arrB = b as unknown[];
      if (arrA.length !== arrB.length) return false;
      for (let i = 0; i < arrA.length; i++) {
        if (!deepEqual(arrA[i], arrB[i])) return false;
      }
      return true;
    }
    
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }
    
    return true;
  }
  
  return a !== a && b !== b; // NaN check
}

/**
 * Simple deep clone.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as any;
  }
  
  // Date, RegExp could be handled here if needed, but for JSON-like forms this is enough.
  
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone((obj as any)[key]);
    }
  }
  return result;
}

/**
 * Generates all parent paths for a given path.
 * e.g., "user.profile.bio" -> ["user", "user.profile"]
 */
export function getParentPaths(path: string): string[] {
  const parts = path.split('.');
  const parents: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    parents.push(parts.slice(0, i).join('.'));
  }
  return parents;
}
