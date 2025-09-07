import { useState } from "react";
import { useSnippetStore } from "@/stores/snippetSlice";

export function Snippets() {
  const {
    snippets,
    addSnippet,
    updateSnippet,
    removeSnippet,
    insertSnippet,
    syncSnippets,
  } = useSnippetStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const startEdit = (snippetId: string) => {
    const snip = snippets.find((s) => s.id === snippetId);
    if (!snip) return;
    setEditingId(snip.id);
    setTitle(snip.title);
    setContent(snip.content);
  };

  const handleSave = () => {
    if (editingId) {
      updateSnippet(editingId, title, content);
    } else {
      addSnippet(title, content);
    }
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  return (
    <div className="p-2 text-sm text-[#333] dark:text-gray-300">
      <div className="mb-2 space-y-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-2 py-1 rounded border border-gray-300 dark:bg-[#1e1e1e] dark:border-[#333]"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          className="w-full h-24 px-2 py-1 rounded border border-gray-300 dark:bg-[#1e1e1e] dark:border-[#333]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-2 py-1 rounded bg-[#e8e8e8] dark:bg-[#333]"
          >
            {editingId ? "Update" : "Add"}
          </button>
          <button
            onClick={() => syncSnippets("/api/snippets")}
            className="px-2 py-1 rounded bg-[#e8e8e8] dark:bg-[#333]"
          >
            Sync
          </button>
        </div>
      </div>

      <ul>
        {snippets.map((snippet) => (
          <li key={snippet.id} className="mb-1 flex items-center justify-between">
            <span
              className="flex-1 truncate cursor-pointer hover:underline"
              onClick={() => insertSnippet(snippet.id)}
            >
              {snippet.title}
            </span>
            <div className="space-x-1">
              <button onClick={() => startEdit(snippet.id)}>Edit</button>
              <button onClick={() => removeSnippet(snippet.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
