/**
 * Retrieves a value from an object using a dot-notation path.
 * @param obj - The source object.
 * @param path - The dot-notation path (e.g., "user.profile.bio").
 * @returns The value at the path, or undefined if not found.
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
 * Sets a value in an object using a dot-notation path.
 * Mutates the object or creates nested structure as needed.
 * @param obj - The target object.
 * @param path - The dot-notation path.
 * @param value - The value to set.
 * @returns The modified object.
 */
export function setByPath<T extends Record<string, any>>(obj: T, path: string, value: unknown): T {
  if (!obj) {
    // We cannot set property of null/undefined
    return {} as T; 
  }
  const keys = path.split('.');
  let current: any = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      // Determine if the next key is an array index or object key
      // simple heuristic: if it looks like an integer, use array (though here we default to object for simplicity unless needed)
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  
  return obj;
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
