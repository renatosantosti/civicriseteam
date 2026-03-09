/**
 * Browser stub for node:async_hooks. Used only in client bundles so that
 * TanStack Start's server-only code (e.g. @tanstack/start-storage-context)
 * loads without throwing when it imports AsyncLocalStorage. The real
 * node:async_hooks is used in SSR; this stub is never used at runtime for
 * request context on the client.
 */
class AsyncLocalStorageStub {
  run(_store, fn) {
    return fn();
  }
  getStore() {
    return undefined;
  }
}

export { AsyncLocalStorageStub as AsyncLocalStorage };
