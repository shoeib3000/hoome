import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto for older Node versions (Node < 19)
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  try {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (e) {
    try {
      (globalThis as any).crypto = webcrypto;
    } catch (err) {
      console.warn("Failed to polyfill globalThis.crypto:", err);
    }
  }
}

if (typeof global !== 'undefined' && !global.crypto) {
  try {
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (e) {
    try {
      (global as any).crypto = webcrypto;
    } catch (err) {
      console.warn("Failed to polyfill global.crypto:", err);
    }
  }
}
