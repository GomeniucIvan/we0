import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MODEL_OPTIONS } from "@/lib/modelOptions";

interface ProviderKeyMap {
  [provider: string]: string;
}

const providerDisplayNames: Record<string, string> = {
  openai: "OpenAI",
  claude: "Anthropic",
  google: "Google",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
};

const getProviders = () => {
  const set = new Set<string>();
  MODEL_OPTIONS.forEach((m) => set.add(m.provider));
  return Array.from(set);
};

export function ModelProviderSettings() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ProviderKeyMap>({});
  const [inputs, setInputs] = useState<ProviderKeyMap>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("modelApiKeys") || "{}");
      setKeys(saved);
      setInputs(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleSave = (provider: string) => {
    const newKeys = { ...keys, [provider]: inputs[provider] || "" };
    setKeys(newKeys);
    localStorage.setItem("modelApiKeys", JSON.stringify(newKeys));
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-medium mb-6">{t("settings.modelProviders")}</h2>
      {getProviders().map((provider) => (
        <div
          key={provider}
          className="p-4 border border-border rounded-lg space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {providerDisplayNames[provider] || provider}
            </span>
            {keys[provider] ? (
              <span className="text-sm font-medium text-green-500 bg-green-50 dark:bg-green-900/30 border border-green-500/50 px-2 py-0.5 rounded-full">
                Ready
              </span>
            ) : (
              <span className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-full">
                Not Set
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs[provider] || ""}
              onChange={(e) =>
                setInputs((prev) => ({ ...prev, [provider]: e.target.value }))
              }
              placeholder={t("settings.keyPlaceholder") || ""}
              className="flex-1 px-3 py-2 text-sm rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              onClick={() => handleSave(provider)}
              className="px-3 py-2 text-sm rounded-md bg-purple-500 text-white hover:bg-purple-600"
            >
              {t("settings.save")}
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {MODEL_OPTIONS.filter((m) => m.provider === provider)
              .map((m) => m.label)
              .join(", ")}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ModelProviderSettings;

