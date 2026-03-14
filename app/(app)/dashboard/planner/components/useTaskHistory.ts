"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { PlanTask } from "@/lib/planner/types";

const MAX_HISTORY = 20;

interface TaskHistoryState {
  tasks: PlanTask[];
  past: PlanTask[][];
  future: PlanTask[][];
}

export type TaskHistoryAction =
  | { type: "SET_TASKS"; tasks: PlanTask[] }
  | { type: "PATCH_TASK"; taskId: string; patch: Partial<PlanTask> }
  | { type: "UNDO" }
  | { type: "REDO" };

function reducer(state: TaskHistoryState, action: TaskHistoryAction): TaskHistoryState {
  switch (action.type) {
    case "SET_TASKS":
      // Server refresh — update tasks without touching undo/redo history
      return { ...state, tasks: action.tasks };

    case "PATCH_TASK": {
      const past = [...state.past, state.tasks];
      if (past.length > MAX_HISTORY) past.shift();
      return {
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, ...action.patch } : t
        ),
        past,
        future: [],
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        tasks: prev,
        past: state.past.slice(0, -1),
        future: [state.tasks, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        tasks: next,
        past: [...state.past, state.tasks],
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}

export function useTaskHistory() {
  const [state, dispatch] = useReducer(reducer, {
    tasks: [],
    past: [],
    future: [],
  });

  // Always-fresh ref so event handlers can read the latest state without stale closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const getState = useCallback(() => stateRef.current, []);

  return {
    tasks: state.tasks,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    dispatch,
    getState,
  };
}
