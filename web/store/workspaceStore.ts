import { create } from "zustand";
import type { CollaboratorUser } from "@/types/mushin";

interface WorkspaceState {
  workspaceId: string | null;
  title: string;
  content: string;
  isSaving: boolean;
  lastSavedAt: Date | null;
  activeCollaborators: CollaboratorUser[];
  aiSuggestion: string | null;
  showAISuggestion: boolean;

  setWorkspaceMeta: (id: string, title: string) => void;
  setContent: (content: string) => void;
  setSaving: (v: boolean) => void;
  setLastSavedAt: (d: Date | null) => void;
  setActiveCollaborators: (users: CollaboratorUser[]) => void;
  showSuggestion: (text: string) => void;
  dismissSuggestion: () => void;
  reset: () => void;
}

const initial = {
  workspaceId: null as string | null,
  title: "",
  content: "",
  isSaving: false,
  lastSavedAt: null as Date | null,
  activeCollaborators: [] as CollaboratorUser[],
  aiSuggestion: null as string | null,
  showAISuggestion: false,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initial,

  setWorkspaceMeta: (id, title) => set({ workspaceId: id, title }),
  setContent: (content) => set({ content }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setActiveCollaborators: (activeCollaborators) => set({ activeCollaborators }),
  showSuggestion: (text) =>
    set({ aiSuggestion: text, showAISuggestion: true }),
  dismissSuggestion: () =>
    set({ aiSuggestion: null, showAISuggestion: false }),
  reset: () => set(initial),
}));
