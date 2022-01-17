import React, { useRef, useCallback } from "react";
import { render, cleanup, act } from "react-testing-library";

import {
  withSolid,
  useObserver,
  createStore,
  createMutable,
  createEffect,
  createComputed,
  createMemo,
  createSignal,
  onCleanup,
  untrack
} from "../src/index";

interface OnCleanupProp {
  handleCleanup?: () => void;
}

const Counter = withSolid<OnCleanupProp>(({ handleCleanup }) => {
  const [state, setState] = createStore<{ count: number; tick: number }>({ count: 0, tick: 0 }),
    [count, setCount] = createSignal(10),
    getCounterText = createMemo(() => `Counter ${state.count} ${count()}`);
  createComputed(() => {
    if (state.tick > 0) {
      setState("count", c => c + 1);
      setCount(untrack(count) + 1);
    }
  }, undefined);
  onCleanup(() => handleCleanup());
  return () => (
    <div
      onClick={() => {
        setState("tick", t => t + 1);
      }}
    >
      {getCounterText()}
    </div>
  );
});

const CounterMutable = withSolid<OnCleanupProp>(({ handleCleanup }) => {
  const state = createMutable({ count: 0, tick: 0 }),
    [count, setCount] = createSignal(10),
    getCounterText = createMemo(() => `Counter ${state.count} ${count()}`);
  createComputed(() => {
    if (state.tick > 0) {
      untrack(() => {
        state.count++;
        setCount(count() + 1);
      });
    }
  }, undefined);
  onCleanup(() => handleCleanup());
  return () => <div onClick={() => state.tick++}>{getCounterText()}</div>;
});

const Nested = () => {
  const [a, setA] = createSignal(0),
    [result, setResult] = createSignal(0),
    refB = useRef(null),
    incrementA = useCallback(() => setA(a() + 1), []),
    incrementB = useCallback(() => refB.current.set(refB.current.value() + 1), []);
  createEffect(() => {
    const [b, setB] = createSignal(a());
    refB.current = { value: b, set: setB };
    createEffect(() => setResult(b()), undefined);
    onCleanup(() => (refB.current = undefined));
  }, undefined);
  return useObserver(() => (
    <>
      <div onClick={incrementA} />
      <div onClick={incrementB} />
      <div>{result()}</div>
    </>
  ));
};

describe("Simple Counter", () => {
  let ref, disposed;
  function handleCleanup() {
    disposed = true;
  }
  test("Create Component", () => {
    const { container } = render(<Counter handleCleanup={handleCleanup} />);
    expect(container.firstElementChild.innerHTML).toBe("Counter 0 10");
    ref = container.firstChild;
  });
  test("Triggering Computed", async () => {
    act(() => ref.click());
    expect(ref.innerHTML).toBe("Counter 1 11");
    act(() => ref.click());
    expect(ref.innerHTML).toBe("Counter 2 12");
  });
  test("Cleanup", () => {
    expect(disposed).toBeUndefined();
    cleanup();
    expect(disposed).toBe(true);
  });
});

describe("Simple Mutable Counter", () => {
  let ref, disposed;
  function handleCleanup() {
    disposed = true;
  }
  test("Create Component", () => {
    const { container } = render(<CounterMutable handleCleanup={handleCleanup} />);
    expect(container.firstElementChild.innerHTML).toBe("Counter 0 10");
    ref = container.firstChild;
  });
  test("Triggering Computed", async () => {
    act(() => ref.click());
    expect(ref.innerHTML).toBe("Counter 1 11");
    act(() => ref.click());
    expect(ref.innerHTML).toBe("Counter 2 12");
  });
  test("Cleanup", () => {
    expect(disposed).toBeUndefined();
    cleanup();
    expect(disposed).toBe(true);
  });
});

describe("Nested Effect", () => {
  let ref;
  test("Create Component", () => {
    const { container } = render(<Nested />);
    expect(container.children[2].innerHTML).toBe("0");
    ref = container.childNodes;
  });
  test("Triggering Effect", async () => {
    act(() => ref[0].click());
    expect(ref[2].innerHTML).toBe("1");
    act(() => ref[1].click());
    expect(ref[2].innerHTML).toBe("2");
    act(() => ref[1].click());
    expect(ref[2].innerHTML).toBe("3");
    act(() => ref[0].click());
    expect(ref[2].innerHTML).toBe("2");
  });
  test("Cleanup", () => {
    cleanup();
  });
});
