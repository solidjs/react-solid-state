import {
  memo,
  PropsWithChildren,
  ReactElement,
  useCallback as rCallback,
  useEffect as rEffect,
  useMemo as rMemo,
  useRef as rRef,
  useState as rState
} from "react";
import {
  createComputed as sComputed,
  createEffect as sEffect,
  createMemo as sMemo,
  createRoot,
  createSignal as sSignal,
  onCleanup as sCleanup
} from "solid-js";
import { createMutable, createStore, Store } from "solid-js/store";
export { batch, untrack } from "solid-js";
export { reconcile, produce } from "solid-js/store";

interface CreateComputed<T> {
  (fn: (v?: T) => T, value: T): void;
}

interface CreateEffect<T> {
  (fn: (v?: T) => T, value: T): void;
}

interface CreateMemo<T> {
  (
    fn: (v?: T) => T,
    value?: undefined,
    options?: { equals?: false | ((prev: T, next: T) => boolean) }
  ): () => T;
}

let inSolidEffect = false;
function trackNesting<T extends any[]>(args: T): T {
  const fn = args[0] as (...args: any[]) => void;
  return [
    function (...args: any[]) {
      const outside = inSolidEffect;
      inSolidEffect = true;
      const ret = fn(...args);
      inSolidEffect = outside;
      return ret;
    },
    ...args.slice(1)
  ] as T;
}

function useForceUpdate() {
  const [, setTick] = rState(0);
  return rCallback(() => setTick(t => t + 1), []);
}

export function useObserver(fn: ReactElement | (() => JSX.Element)) {
  const forceUpdate = useForceUpdate(),
    [tracking, trigger] = useSignal({}),
    run = rRef<ReactElement | (() => JSX.Element)>(),
    dispose = rRef<() => void>(),
    results = rRef<ReactElement | null>();
  run.current = fn;
  rEffect(() => dispose.current, []);
  if (!dispose.current) {
    createRoot(disposer => {
      dispose.current = disposer;
      sComputed(() => {
        const v = tracking() as { top?: boolean };
        if (!("top" in v)) return;
        else if (v.top && run.current)
          results.current = (run.current as {} as () => typeof results.current)();
        else forceUpdate();
        v.top = false;
      });
    });
  }
  trigger({ top: true });
  return results.current;
}

export function withSolid<P extends object>(
  ComponentType: (props: PropsWithChildren<P>, r: any) => () => JSX.Element
) {
  return memo<P>((p, r) => {
    const component = ComponentType(p, r);
    return (component && useObserver(component)) || null;
  });
}

export function useStore<T>(state: T | Store<T>, options?: { name?: string }) {
  if (inSolidEffect) return createStore<T>(state, options);
  return rMemo(() => createStore<T>(state, options), []);
}

export function useMutable<T>(state: T | Store<T>, options?: { name?: string }) {
  if (inSolidEffect) return createMutable<T>(state, options);
  return rMemo(() => createMutable<T>(state, options), []);
}

export function useSignal<T>(
  value: T,
  options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }
) {
  if (inSolidEffect) return sSignal<T>(value, options);
  return rMemo(() => sSignal<T>(value, options), []);
}

export function useEffect<T>(...args: Parameters<CreateEffect<T>>) {
  if (inSolidEffect) return sEffect<T>(...args);
  const dispose = rRef<() => void>();
  rEffect(() => dispose.current, []);
  if (!dispose.current) {
    createRoot(disposer => {
      dispose.current = disposer;
      sEffect<T>(...trackNesting(args));
    });
  }
}

export function useComputed<T>(...args: Parameters<CreateComputed<T>>) {
  if (inSolidEffect) return sComputed<T>(...args);
  const dispose = rRef<() => void>();
  rEffect(() => dispose.current, []);
  if (!dispose.current) {
    createRoot(disposer => {
      dispose.current = disposer;
      sComputed(...trackNesting(args));
    });
  }
}

export function useMemo<T>(...args: Parameters<CreateMemo<T>>) {
  if (inSolidEffect) return sMemo<T>(...args);
  let dispose: () => void;
  rEffect(() => dispose, []);
  return rMemo(
    () =>
      createRoot(disposer => {
        dispose = disposer;
        return sMemo(...trackNesting(args));
      }),
    []
  );
}

export function useCleanup(fn: Parameters<typeof sCleanup>[0]) {
  inSolidEffect ? sCleanup(fn) : rEffect(() => fn, []);
}

// solid naming convention for easy swap
export {
  useSignal as createSignal,
  useMemo as createMemo,
  useCleanup as onCleanup,
  useEffect as createEffect,
  useComputed as createComputed,
  useStore as createStore,
  useMutable as createMutable
};
