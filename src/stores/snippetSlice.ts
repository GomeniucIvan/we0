import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { useEditorStore } from "@/components/WeIde/stores/editorStore";
import { useFileStore } from "@/components/WeIde/stores/fileStore";

export interface Snippet {
  id: string;
  title: string;
  content: string;
}

interface SnippetState {
  snippets: Snippet[];
  addSnippet: (title: string, content: string) => void;
  updateSnippet: (id: string, title: string, content: string) => void;
  removeSnippet: (id: string) => void;
  insertSnippet: (id: string) => void;
  syncSnippets: (endpoint: string) => Promise<void>;
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set, get) => ({
      snippets: [],
      addSnippet: (title, content) =>
        set((state) => ({
          snippets: [...state.snippets, { id: uuidv4(), title, content }],
        })),
      updateSnippet: (id, title, content) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, title, content } : s
          ),
        })),
      removeSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),
      insertSnippet: (id) => {
        const snippet = get().snippets.find((s) => s.id === id);
        if (!snippet) return;
        const { currentFile } = useEditorStore.getState();
        const { getContent, updateContent } = useFileStore.getState();
        if (currentFile) {
          const existing = getContent(currentFile);
          updateContent(currentFile, existing + snippet.content);
        }
      },
      syncSnippets: async (endpoint: string) => {
        try {
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snippets: get().snippets }),
          });
        } catch (e) {
          console.error("Failed to sync snippets", e);
        }
      },
    }),
    {
      name: "snippet-storage",
    }
  )
);
