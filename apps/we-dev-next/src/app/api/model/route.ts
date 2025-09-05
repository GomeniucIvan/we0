import { NextResponse } from "next/server";
import { modelConfig } from "./config";

// 获取模型配置, 可以迁移到配置中心
export async function POST() {
    try {
        // LM Studio
        const lmstudioBase =
            modelConfig.find((m) => m.provider === "lmstudio")?.apiUrl ||
            "http://localhost:1234/v1";
        const res = await fetch(`${lmstudioBase}/models`);
        if (res.ok) {
            const data = await res.json();
            const models = Array.isArray(data.data) ? data.data : [];
            for (const m of models) {
                const id = m?.id;
                if (!id) continue;
                // 如果模型列表中没有该模型，则追加到配置中
                if (!modelConfig.some((item) => item.modelKey === id)) {
                    modelConfig.push({
                        modelName: id,
                        modelKey: id,
                        useImage: false,
                        provider: "lmstudio",
                        description: `LM Studio model ${id}`,
                        apiUrl: lmstudioBase,
                        apiKey: "",
                        functionCall: false,
                    });
                }
            }
        }
    } catch (e) {
        console.error("Failed to load LM Studio models", e);
    }

    // OpenAI models
    try {
        const openaiBase =
            process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            const res = await fetch(`${openaiBase}/models`, {
                headers: { Authorization: `Bearer ${openaiKey}` },
            });
            if (res.ok) {
                const data = await res.json();
                const models = Array.isArray(data.data) ? data.data : [];
                for (const m of models) {
                    const id = m?.id;
                    if (!id) continue;
                    const exist = modelConfig.find((item) => item.modelKey === id);
                    if (!exist) {
                        modelConfig.push({
                            modelName: id,
                            modelKey: id,
                            useImage: false,
                            provider: "openai",
                            description: `OpenAI model ${id}`,
                            apiUrl: openaiBase,
                            apiKey: openaiKey,
                            functionCall: true,
                        });
                    } else {
                        exist.apiUrl = exist.apiUrl || openaiBase;
                        exist.apiKey = exist.apiKey || openaiKey;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to load OpenAI models", e);
    }

    // Google models
    try {
        const googleBase =
            process.env.GOOGLE_API_BASE_URL ||
            "https://generativelanguage.googleapis.com/v1beta";
        const googleKey = process.env.GOOGLE_API_KEY;
        if (googleKey) {
            const res = await fetch(`${googleBase}/models?key=${googleKey}`);
            if (res.ok) {
                const data = await res.json();
                const models = Array.isArray(data.models) ? data.models : [];
                for (const m of models) {
                    const id = m?.name;
                    if (!id) continue;
                    const exist = modelConfig.find((item) => item.modelKey === id);
                    const apiUrl = `${googleBase}/openai`;
                    if (!exist) {
                        modelConfig.push({
                            modelName: m.displayName || id,
                            modelKey: id,
                            useImage: true,
                            provider: "google",
                            description:
                                m.description || `Google model ${m.displayName || id}`,
                            apiUrl,
                            apiKey: googleKey,
                            functionCall: true,
                        });
                    } else {
                        exist.apiUrl = exist.apiUrl || apiUrl;
                        exist.apiKey = exist.apiKey || googleKey;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to load Google models", e);
    }

    // 过滤掉 key 部分并返回前端需要的字段
    const config = modelConfig.map((item) => {
        return {
            label: item.modelName,
            value: item.modelKey,
            useImage: item.useImage,
            description: item.description,
            icon: item.iconUrl,
            provider: item.provider,
            functionCall: item.functionCall,
        };
    });
    return NextResponse.json(config);
}