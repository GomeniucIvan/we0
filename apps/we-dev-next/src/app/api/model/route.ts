import { NextResponse } from "next/server";
import { modelConfig } from "./config";

// 获取模型配置, 可以迁移到配置中心
export async function POST() {
    try {
        // LM Studio
        const lmstudioBase = modelConfig.find(m => m.provider === "lmstudio")?.apiUrl || "http://localhost:1234/v1";
        const res = await fetch(`${lmstudioBase}/models`);
        if (res.ok) {
            const data = await res.json();
            const models = Array.isArray(data.data) ? data.data : [];
            for (const m of models) {
                const id = m?.id;
                if (!id) continue;
                // 如果模型列表中没有该模型，则追加到配置中
                if (!modelConfig.some(item => item.modelKey === id)) {
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

    // 过滤掉 key 部分并返回前端需要的字段
    const config = modelConfig.map(item => {
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