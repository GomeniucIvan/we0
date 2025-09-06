import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  streamText as _streamText,
  convertToCoreMessages,
  generateObject,
} from "ai";

import type { LanguageModel, Message } from "ai";
import { modelConfig, getModelConfig } from "../model/config";
import { createDeepSeek } from "@ai-sdk/deepseek";
export const MAX_TOKENS = 16000;

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], "model">;
let initOptions = {};
export function getOpenAIModel(baseURL: string, apiKey: string, model: string, provider?: string) {
  if (provider === "deepseek") {
    const deepseek = createDeepSeek({
      apiKey,
      baseURL,
    });
    initOptions = {}
    return deepseek(model);
  }
  if (provider && provider.indexOf('claude') > -1) {
    const openai = createOpenAI({
      apiKey,
      baseURL,
    });
    initOptions = {
      maxTokens: provider.indexOf('claude-3-7-sonnet') > -1 ? 128000 : 8192,
    }
    return openai(model);
  }

  const openai = createOpenAI({
    baseURL,
    apiKey,
  });
  initOptions = {};
  return openai(model);
}

export type Messages = Message[];

const defaultModel = getOpenAIModel(
    process.env.THIRD_API_URL,
    process.env.THIRD_API_KEY,
    "claude-3-5-sonnet-20240620",
    modelConfig.find((item) => item.modelKey === "claude-3-5-sonnet-20240620")?.provider,
) as LanguageModel;

export async function generateObjectFn(messages: Messages) {
  return generateObject({
    model: getOpenAIModel(
        process.env.THIRD_API_URL,
        process.env.THIRD_API_KEY,
        "gpt-4.1-mini",
        modelConfig.find((item) => item.modelKey === "gpt-4.1-mini")?.provider
    ) as LanguageModel,
    schema: z.object({
      files: z.array(z.string()),
    }),
    messages: convertToCoreMessages(messages),
  });
}

export async function streamTextFn(
    messages: Messages,
    options?: StreamingOptions,
    modelKey?: string,
) {
  const config = await getModelConfig();
  const {
    apiKey = process.env.THIRD_API_KEY,
    apiUrl = process.env.THIRD_API_URL,
    provider,
  } = config.find((item) => item.modelKey === modelKey) || {};
  const model = getOpenAIModel(
      apiUrl,
      apiKey,
      modelKey,
      provider
  ) as LanguageModel;
  const newMessages = messages.map((item) => {
    if(item.role === 'assistant'){
      delete item.parts
    }
    return item
  })
  return _streamText({
    model: model || defaultModel,
    messages: convertToCoreMessages(newMessages),
    maxTokens: MAX_TOKENS,
    ...initOptions,
    ...options,
  });
}