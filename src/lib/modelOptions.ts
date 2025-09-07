import type { IModelOption } from "@/components/AiChat/chat";

export const MODEL_OPTIONS: IModelOption[] = [
  { value: "gpt-5", label: "GPT 5", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "gpt-5-mini", label: "GPT 5 Mini", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "gpt-5-nano", label: "GPT 5 Nano", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "gpt-4.1", label: "GPT 4.1", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "gpt-4.1-mini", label: "GPT 4.1 Mini", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "o3-mini", label: "o3 Mini", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "o4-mini", label: "o4 Mini", useImage: true, provider: "openai", quota: 2, functionCall: true },
  { value: "claude-sonnet-4-20250514", label: "Claude 4 Sonnet", useImage: true, provider: "claude", quota: 2, functionCall: true },
  { value: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet", useImage: true, provider: "claude", quota: 2, functionCall: true },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", useImage: true, provider: "claude", quota: 2, functionCall: true },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", useImage: true, provider: "claude", quota: 2, functionCall: true },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", useImage: true, provider: "google", quota: 2, functionCall: true },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", useImage: true, provider: "google", quota: 2, functionCall: true },
  { value: "qwen/qwen3-coder", label: "Qwen3 Coder", useImage: true, provider: "openrouter", quota: 2 },
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek v3 (free)", useImage: true, provider: "openrouter", quota: 2 },
  { value: "moonshotai/kimi-k2", label: "Kimi K2", useImage: true, provider: "openrouter", quota: 2 },
  { value: "deepseek/deepseek-r1-0528", label: "DeepSeek R1", useImage: true, provider: "openrouter", quota: 2 },
  // Models from the previous implementation
  { value: "deepseek-reasoner", label: "DeepSeek R1", useImage: true, provider: "deepseek", quota: 2 },
  { value: "deepseek-chat", label: "DeepSeek V3", useImage: true, provider: "deepseek", quota: 2 }
];

