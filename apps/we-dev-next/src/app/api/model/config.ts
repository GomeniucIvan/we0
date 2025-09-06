// Model configuration file
// Configure models based on actual scenarios

export interface ModelConfig {
    modelName: string;
    modelKey: string;
    useImage: boolean;
    description?: string;
    iconUrl?: string;
    provider?: string; // Model provider
    apiKey?: string;
    apiUrl?: string;
    functionCall: boolean;
}

export const modelConfig: ModelConfig[] = [
    {
        modelName: 'claude-3-5-sonnet',
        modelKey: 'claude-3-5-sonnet-20240620',
        useImage: true,
        provider: 'claude',
        description: 'Claude 3.5 Sonnet model',
        functionCall: true,
    },
    {
        modelName: 'gpt-4o-mini',
        modelKey: 'gpt-4o-mini',
        useImage: false,
        provider: 'openai',
        description: 'GPT-4 Optimized Mini model',
        functionCall: true,
    },
    {
        modelName: 'deepseek-R1',
        modelKey: 'deepseek-reasoner',
        useImage: false,
        provider: 'deepseek',
        description: 'Deepseek R1 model with reasoning and chain-of-thought capabilities',
        functionCall: false,
    },
    {
        modelName: 'deepseek-v3',
        modelKey: 'deepseek-chat',
        useImage: false,
        provider: 'deepseek',
        description: 'Deepseek V3 model',
        functionCall: true,
    },
    {
        modelName: 'LM Studio',
        modelKey: 'lmstudio',
        useImage: false,
        provider: 'lmstudio',
        description: 'Local LM Studio model',
        apiUrl: 'http://localhost:1234/v1',
        apiKey: '',
        functionCall: false,
    }
]

export async function getModelConfig(): Promise<ModelConfig[]> {
    const config: ModelConfig[] = [...modelConfig]
    const lmstudioBase = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1'

    try {
        const res = await fetch(`${lmstudioBase}/models`, { cache: 'no-store' })
        if (res.ok) {
            const data = await res.json()
            const models = Array.isArray(data.data) ? data.data : []
            for (const m of models) {
                const id = m?.id
                if (!id) continue
                if (!config.some(item => item.modelKey === id)) {
                    config.push({
                        modelName: id,
                        modelKey: id,
                        useImage: false,
                        provider: 'lmstudio',
                        description: `LM Studio model ${id}`,
                        apiUrl: lmstudioBase,
                        apiKey: '',
                        functionCall: false,
                    })
                }
            }
        }
    } catch (e) {
        console.error('Failed to load LM Studio models', e)
    }

    return config
}