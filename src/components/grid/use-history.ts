"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Undo/redo for editor state. Rapid successive changes (dragging a slider,
 * panning a photo) are coalesced into one history step. History lives in refs
 * and is updated outside React state updaters, so StrictMode double-invocation
 * can't corrupt it.
 */
export function useHistory<T>(initial: T, coalesceMs = 400) {
  const [state, setState] = useState(initial);
  const cur = useRef(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef(0);

  const commit = (value: T) => {
    cur.current = value;
    setState(value);
  };

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(cur.current) : next;
      if (value === cur.current) return;
      const now = Date.now();
      if (now - last.current > coalesceMs) {
        past.current = [...past.current.slice(-79), cur.current];
        future.current = [];
      }
      last.current = now;
      commit(value);
    },
    [coalesceMs],
  );

  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    last.current = 0;
    commit(value);
  }, []);

  const undo = useCallback(() => {
    const p = past.current.pop();
    if (p === undefined) return;
    future.current = [cur.current, ...future.current];
    last.current = 0;
    commit(p);
  }, []);

  const redo = useCallback(() => {
    const [n, ...rest] = future.current;
    if (n === undefined) return;
    future.current = rest;
    past.current = [...past.current, cur.current];
    last.current = 0;
    commit(n);
  }, []);

  return { state, set, reset, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
