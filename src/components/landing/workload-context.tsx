"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { WorkloadId } from "@/lib/recommend/v3/types";

export interface WorkloadState {
  selected: WorkloadId | null;
}

export const workloadInitialState: WorkloadState = { selected: null };

export type WorkloadAction =
  | { type: "select"; id: WorkloadId }
  | { type: "clear" };

/**
 * Explicit visual-context selection only. Same id toggles back to null
 * (resume overview). Unknown actions are no-ops. Never quiz state.
 */
export function workloadReducer(state: WorkloadState, action: WorkloadAction): WorkloadState {
  switch (action.type) {
    case "select":
      return { selected: state.selected === action.id ? null : action.id };
    case "clear":
      return { selected: null };
    default:
      return state;
  }
}

interface WorkloadContextValue {
  selected: WorkloadId | null;
  select: (id: WorkloadId) => void;
  clear: () => void;
}

const WorkloadContext = createContext<WorkloadContextValue | null>(null);

export function WorkloadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workloadReducer, workloadInitialState);
  const value = useMemo<WorkloadContextValue>(
    () => ({
      selected: state.selected,
      select: (id: WorkloadId) => dispatch({ type: "select", id }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state.selected]
  );
  return <WorkloadContext.Provider value={value}>{children}</WorkloadContext.Provider>;
}

export function useWorkload(): WorkloadContextValue {
  const ctx = useContext(WorkloadContext);
  if (!ctx) throw new Error("useWorkload must be used within WorkloadProvider");
  return ctx;
}
