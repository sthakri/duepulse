import { create } from "zustand";
import { Tables } from "@/database.types";

type Assignment = Tables<"assignments">;

interface DuePulseState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  assignments: Assignment[];
  tokenExpired: boolean;
  setIsSyncing: (v: boolean) => void;
  setLastSyncedAt: (v: string | null) => void;
  setAssignments: (v: Assignment[]) => void;
  setTokenExpired: (v: boolean) => void;
}

export const useDuePulseStore = create<DuePulseState>()((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  assignments: [],
  tokenExpired: false,
  setIsSyncing: (v) => set({ isSyncing: v }),
  setLastSyncedAt: (v) => set({ lastSyncedAt: v }),
  setAssignments: (v) => set({ assignments: v }),
  setTokenExpired: (v) => set({ tokenExpired: v }),
}));
