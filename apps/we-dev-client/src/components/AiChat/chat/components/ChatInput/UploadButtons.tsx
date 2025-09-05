import React, { useState, useRef, useEffect } from "react"
import classNames from "classnames"
import { App, Tooltip, Modal, Input } from "antd"
import { Image, ChevronDown, Figma } from "lucide-react"
import type { UploadButtonsProps } from "./types"

import { useTranslation } from "react-i18next"
import { IModelOption } from "../.."
import useChatStore from "@/stores/chatSlice"
import { aiProvierIcon } from "./config"
import MCPToolsButton from "./MCPToolsButton"

export const UploadButtons: React.FC<UploadButtonsProps> = ({
                                                              isLoading,
                                                              isUploading,
                                                              append,
                                                              onImageClick,
                                                              baseModal,
                                                              messages,
                                                              handleSubmitWithFiles,
                                                              setMessages,
                                                              setBaseModal,
                                                            }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { modelOptions, clearImages } = useChatStore()
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false)
  const [figmaUrl, setFigmaUrl] = useState(() => localStorage.getItem('figmaUrl') || '')
  const [figmaToken, setFigmaToken] = useState(() => localStorage.getItem('figmaToken') || '')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleModelSelect = (model: IModelOption) => {
    setBaseModal(model)
    setIsOpen(false)
    clearImages()
  }

  // Group models by provider and type (cloud/local)
  const groupedOptions = React.useMemo(() => {
    const groups: {
      cloud: Record<string, IModelOption[]>;
      local: Record<string, IModelOption[]>;
    } = { cloud: {}, local: {} };
    modelOptions.forEach((m) => {
      const provider = m.provider || 'unknown';
      const type = provider === 'ollama' || provider === 'lmstudio' ? 'local' : 'cloud';
      if (!groups[type][provider]) {
        groups[type][provider] = [];
      }
      groups[type][provider].push(m);
    });
    return groups;
  }, [modelOptions]);

  const [hoverProvider, setHoverProvider] = useState<string | null>(null);
  const [hoverLocalProvider, setHoverLocalProvider] = useState<string | null>(null);

  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Anthropic',
    google: 'Google',
    openrouter: 'OpenRouter',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
  };

  // Define a reusable button style component
  const ToolbarButton = React.forwardRef<HTMLButtonElement, any>((props, ref) => (
      <button
          ref={ref}
          {...props}
          className={classNames(
              "p-2 text-gray-600 dark:text-gray-500 flex hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500/20 rounded-lg transition-all duration-200",
              props.disabled && "opacity-50 cursor-not-allowed",
              props.className
          )}
      >
        {props.children}
      </button>
  ))
  const isElectron = typeof window !== 'undefined' && !!window.electron;

  const canUseMCP = isElectron && baseModal.functionCall;

  return (
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          {/* MCP Tools Button - Disabled when functionCall is false */}
          {isElectron && (
              <Tooltip
                  title={
                    <div className="text-xs">
                      <div className="font-medium mb-1">
                        {!canUseMCP
                            ? t("chat.buttons.mcp_disabled")
                            : t("chat.buttons.mcp_tools")}
                      </div>
                      <div className="text-gray-300">
                        {!canUseMCP
                            ? t("chat.buttons.not_support_mcp")
                            : t("chat.buttons.click_to_use_mcp")}
                      </div>
                    </div>
                  }
                  placement="bottom"
              >
            <span className={!canUseMCP ? "cursor-not-allowed" : ""}>
              <MCPToolsButton
                  ToolbarButton={ToolbarButton}
                  disabled={!canUseMCP}
              />
            </span>
              </Tooltip>
          )}

          {/* figma todo */}
          {/* <Tooltip
          title={
            <div className="text-xs">
              <div className="font-medium mb-1">
                {t("chat.buttons.figma_integration")}
              </div>
            </div>
          }
          placement="bottom"
        >
          <button
            type="button"
            onClick={() => setIsFigmaModalOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-500 flex hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500/20 rounded-lg transition-all duration-200"
          >
            <Figma className="w-4 h-4" />
          </button>
        </Tooltip> */}

          <Tooltip
              title={
                <div className="text-xs">
                  <div className="font-medium mb-1">
                    {isLoading || isUploading || !baseModal.useImage
                        ? t("chat.buttons.upload_disabled")
                        : t("chat.buttons.upload_image")}
                  </div>
                  <div className="text-gray-300">
                    {isLoading || isUploading
                        ? t("chat.buttons.waiting")
                        : !baseModal.useImage
                            ? t("chat.buttons.not_support_image")
                            : t("chat.buttons.click_to_upload")}
                  </div>
                </div>
              }
              placement="bottom"
          >
            <ToolbarButton
                type="button"
                onClick={onImageClick}
                disabled={isLoading || isUploading || !baseModal.useImage}
            >
              <Image className="w-4 h-4" />
            </ToolbarButton>
          </Tooltip>
        </div>

        <div className="relative ml-2" ref={dropdownRef}>
          <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={classNames(
                  "flex items-center justify-between w-[180px] px-2 py-1 text-[11px] text-gray-700 dark:text-gray-300 bg-transparent dark:bg-[#252525] rounded-md transition-colors duration-200",
                  isOpen
                      ? "bg-gray-100 dark:bg-[#252525]"
                      : "hover:bg-gray-100 dark:hover:bg-[#252525]"
              )}
          >
            <span>{baseModal.label}</span>
            <ChevronDown
                className={classNames(
                    "w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-200",
                    isOpen ? "-rotate-180" : "rotate-0"
                )}
            />
          </button>

          {isOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-[240px] bg-white dark:bg-[#18181a] border border-gray-200 dark:border-gray-600/30 rounded-lg shadow-lg z-50 max-h-[300px] overflow-auto">
                <div className="flex flex-col w-full text-[11px]">
                  <div className="px-3 py-1 text-gray-400 font-semibold">Cloud Models</div>
                  {Object.entries(groupedOptions.cloud).map(([provider, models]) => (
                      <div
                          key={provider}
                          className="relative"
                          onMouseEnter={() => setHoverProvider(provider)}
                          onMouseLeave={() => setHoverProvider(null)}
                      >
                        <div className="w-full px-3 py-1.5 flex justify-between hover:bg-gray-100 dark:hover:bg-[#252525] cursor-pointer">
                          <div className="flex items-center gap-2">
                            {aiProvierIcon[provider] && React.createElement(aiProvierIcon[provider])}
                            {providerLabels[provider] || provider}
                          </div>
                          <span className="text-gray-400">{models.length} models</span>
                        </div>
                        {hoverProvider === provider && (
                            <div className="absolute top-0 left-full ml-1 w-[200px] bg-white dark:bg-[#18181a] border border-gray-200 dark:border-gray-600/30 rounded-lg shadow-lg max-h-[300px] overflow-auto z-50">
                              {models.map(model => (
                                  <button
                                      key={model.value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleModelSelect(model as IModelOption);
                                      }}
                                      className={classNames(
                                          "w-full px-3 py-1.5 text-left transition-colors duration-200",
                                          "hover:bg-gray-100 dark:hover:bg-[#252525]",
                                          baseModal.value === model.value
                                              ? "text-blue-600 dark:text-blue-400"
                                              : "text-gray-700 dark:text-gray-300",
                                      )}
                                  >
                                    {model.label}
                                  </button>
                              ))}
                            </div>
                        )}
                      </div>
                  ))}

                  <div className="px-3 py-1 mt-2 text-gray-400 font-semibold border-t border-gray-200 dark:border-gray-600/30">Local Models</div>
                  {Object.entries(groupedOptions.local).map(([provider, models]) => (
                      <div
                          key={provider}
                          className="relative"
                          onMouseEnter={() => setHoverLocalProvider(provider)}
                          onMouseLeave={() => setHoverLocalProvider(null)}
                      >
                        <div className="w-full px-3 py-1.5 flex justify-between hover:bg-gray-100 dark:hover:bg-[#252525] cursor-pointer">
                          <div className="flex items-center gap-2">
                            {aiProvierIcon[provider] && React.createElement(aiProvierIcon[provider])}
                            {providerLabels[provider] || provider}
                          </div>
                          <span className="text-gray-400">{models.length} models</span>
                        </div>
                        {hoverLocalProvider === provider && (
                            <div className="absolute top-0 left-full ml-1 w-[200px] bg-white dark:bg-[#18181a] border border-gray-200 dark:border-gray-600/30 rounded-lg shadow-lg max-h-[300px] overflow-auto z-50">
                              {models.length === 0 ? (
                                  <div className="px-3 py-1.5 text-red-500 text-xs">Error loading</div>
                              ) : (
                                  models.map(model => (
                                      <button
                                          key={model.value}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleModelSelect(model as IModelOption);
                                          }}
                                          className={classNames(
                                              "w-full px-3 py-1.5 text-left transition-colors duration-200",
                                              "hover:bg-gray-100 dark:hover:bg-[#252525]",
                                              baseModal.value === model.value
                                                  ? "text-blue-600 dark:text-blue-400"
                                                  : "text-gray-700 dark:text-gray-300",
                                          )}
                                      >
                                        {model.label}
                                      </button>
                                  ))
                              )}
                            </div>
                        )}
                      </div>
                  ))}
                </div>
              </div>
          )}
        </div>
      </div>
  )
}