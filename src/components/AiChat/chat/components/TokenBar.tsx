import React, { useState, useMemo } from "react";
import { Eye } from "lucide-react";
import { useFileStore } from "@/components/WeIde/stores/fileStore";

interface TokenBarProps {
  input: string;
  messages: Array<{ role: string; content: string }>;
}

function countTokens(text: string): number {
  if (!text) return 0;
  const tokens = text.trim().split(/\s+/);
  return tokens.filter(Boolean).length;
}

function buildFileTree(paths: string[]) {
  const tree: Record<string, any> = {};
  for (const path of paths) {
    const parts = path.split("/");
    let current = tree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      if (index < parts.length - 1) {
        current = current[part];
      }
    });
  }
  return tree;
}

const TreeNode: React.FC<{ name: string; node: any }> = ({ name, node }) => {
  const [open, setOpen] = useState(false);
  const isFile = node === null;
  return (
    <div className="pl-2">
      <div
        className="flex items-center cursor-pointer select-none"
        onClick={() => !isFile && setOpen(!open)}
      >
        {!isFile && <span className="mr-1">{open ? "-" : "+"}</span>}
        <span>{name}</span>
      </div>
      {!isFile && open && (
        <div className="ml-4">
          {Object.entries(node).map(([childName, childNode]) => (
            <TreeNode key={childName} name={childName} node={childNode} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TokenBar: React.FC<TokenBarProps> = ({ input, messages }) => {
  const { files } = useFileStore();
  const [showContext, setShowContext] = useState(false);
  const fileTree = useMemo(() => buildFileTree(Object.keys(files)), [files]);

  const instructionTokens = messages
    .filter((m) => m.role === "system")
    .reduce((sum, m) => sum + countTokens(m.content), 0);
  const messageTokens = messages
    .filter((m) => m.role !== "system")
    .reduce((sum, m) => sum + countTokens(m.content), 0);
  const inputTokens = countTokens(input);

  const totalTokens = instructionTokens + messageTokens + inputTokens;
  const instructionPercent = totalTokens ? (instructionTokens / totalTokens) * 100 : 0;
  const messagePercent = totalTokens ? (messageTokens / totalTokens) * 100 : 0;
  const inputPercent = totalTokens ? (inputTokens / totalTokens) * 100 : 0;

  return (
    <div className="px-4 pb-2 text-xs">
      <div className="flex justify-between mb-1 text-xs text-gray-500 dark:text-gray-400">
        <span>Tokens: {totalTokens}</span>
        <button
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => setShowContext(!showContext)}
        >
          <Eye className="w-3 h-3" />
        </button>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-purple-400"
          style={{ width: `${instructionPercent}%` }}
        />
        <div
          className="h-full bg-blue-400"
          style={{ width: `${messagePercent}%` }}
        />
        <div
          className="h-full bg-yellow-400"
          style={{ width: `${inputPercent}%` }}
        />
      </div>
      <div className="mt-1 grid grid-cols-3 gap-x-2 text-[10px] text-gray-600 dark:text-gray-300">
        <span>Instructions: {instructionTokens}</span>
        <span>Messages: {messageTokens}</span>
        <span>Input: {inputTokens}</span>
      </div>
      {showContext && (
        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
          {Object.keys(fileTree).length === 0 ? (
            <div>No context files</div>
          ) : (
            Object.entries(fileTree).map(([name, node]) => (
              <TreeNode key={name} name={name} node={node} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TokenBar;
