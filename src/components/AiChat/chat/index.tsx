import {useEffect, useMemo, useRef, useState} from "react";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import {toast} from "react-toastify";
import {uploadImage} from "@/api/chat";
import useChatStore from "../../../stores/chatSlice";
import {useFileStore} from "../../WeIde/stores/fileStore";
import {db} from "../../../utils/indexDB";
import {v4 as uuidv4} from "uuid";
import {eventEmitter} from "../utils/EventEmitter";
import {MessageItem} from "./components/MessageItem";
import {ChatInput, ChatMode} from "./components/ChatInput";
import Tips from "./components/Tips";
import {parseMessage} from "../../../utils/messagepParseJson";
import useUserStore from "../../../stores/userSlice";
import {useLimitModalStore} from "../../UserModal";
import {updateFileSystemNow} from "../../WeIde/services";
import {parseMessages} from "../useMessageParser";
import {createMpIcon} from "@/utils/createWtrite";
import {useTranslation} from "react-i18next";
import useChatModeStore from "../../../stores/chatModeSlice";
import useTerminalStore from "@/stores/terminalSlice";
import {checkExecList, checkFinish} from "../utils/checkFinish";
import {useUrlData} from "@/hooks/useUrlData";
import {MCPTool} from "@/types/mcp";
import useMCPTools from "@/hooks/useMCPTools";
import { MODEL_OPTIONS } from "@/lib/modelOptions";
import { getAppBaseUrl } from "@/utils/appBaseUrl";
import path from "path";

type WeMessages = (Message & {
    summary?: string;
    experimental_attachments?: Array<{
        id: string;
        name: string;
        type: string;
        localUrl: string;
        contentType: string;
        url: string;
    }>
})[]

const getProjectBasePath = () => {
    const config = JSON.parse(localStorage.getItem("settingsConfig") || "{}");
    return config.projectSavePath || "";
};

const ipcRenderer = window?.electron?.ipcRenderer;
export const excludeFiles = [
    "components/weicon/base64.js",
    "components/weicon/icon.css",
    "components/weicon/index.js",
    "components/weicon/index.json",
    "components/weicon/index.wxml",
    "components/weicon/icondata.js",
    "components/weicon/index.css",
    "/miniprogram/components/weicon/base64.js",
    "/miniprogram/components/weicon/icon.css",
    "/miniprogram/components/weicon/index.js",
    "/miniprogram/components/weicon/index.json",
    "/miniprogram/components/weicon/index.wxml",
    "/miniprogram/components/weicon/icondata.js",
    "/miniprogram/components/weicon/index.css",
];

const API_BASE = getAppBaseUrl();

export interface IModelOption {
    value: string;
    label: string;
    useImage: boolean;
    quota: number;
    from?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    provider?: string;
    functionCall?: boolean;
}

function convertToBoltAction(obj: Record<string, string>): string {
    return Object.entries(obj)
        .filter(([filePath]) => !excludeFiles.includes(filePath))
        .map(
            ([filePath, content]) =>
                `<boltAction type="file" filePath="${filePath}">\n${content}\n</boltAction>`
        )
        .join("\n\n");
}

export const BaseChat = ({uuid: propUuid}: { uuid?: string }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {otherConfig} = useChatStore();
    const apiKeys = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("modelApiKeys") || "{}");
        } catch {
            return {};
        }
    }, []);
    const {t} = useTranslation();
    const [checkCount, setCheckCount] = useState(0);
    const [visible, setVisible] = useState(false);
    const defaultModel = MODEL_OPTIONS.find(m => m.value === "gpt-4.1-mini") || MODEL_OPTIONS[0];
    const [baseModal, setBaseModal] = useState<IModelOption>(() => {
        try {
            const stored = localStorage.getItem("selectedModel");
            if (stored) {
                return JSON.parse(stored) as IModelOption;
            }
        } catch (e) {
            console.error("Failed to load saved model", e);
        }
        return defaultModel;
    });
    const {
        files,
        isFirstSend,
        isUpdateSend,
        setIsFirstSend,
        setIsUpdateSend,
        setFiles,
        setEmptyFiles,
        errors,
        updateContent,
        clearErrors,
        setOldFiles
    } = useFileStore();
    const {mode, setInitOpen} = useChatModeStore();
    // 使用全局状态
    const {
        uploadedImages,
        addImages,
        removeImage,
        clearImages,
        setModelOptions,
    } = useChatStore();
    const {resetTerminals} = useTerminalStore();
    const filesInitObj = {} as Record<string, string>;
    const filesUpdateObj = {} as Record<string, string>;
    Object.keys(isFirstSend).forEach((key) => {
        isFirstSend[key] && (filesInitObj[key] = files[key]);
    });
    Object.keys(isUpdateSend).forEach((key) => {
        isUpdateSend[key] && (filesUpdateObj[key] = files[key]);
    });

    const initConvertToBoltAction = convertToBoltAction({
        ...filesInitObj,
        ...filesUpdateObj,
    });

    const updateConvertToBoltAction = convertToBoltAction(filesUpdateObj);

    useEffect(() => {
        setModelOptions(MODEL_OPTIONS);
    }, [setModelOptions]);

    useEffect(() => {
        try {
            localStorage.setItem("selectedModel", JSON.stringify(baseModal));
        } catch (e) {
            console.error("Failed to save selected model", e);
        }
    }, [baseModal]);

    // Initialize messages state
    const [messages, setMessages] = useState<WeMessages>([]);

    // Control initial open state based on message presence
    useEffect(() => {
        setInitOpen(messages.length === 0);
    }, [messages, setInitOpen]);

    // Setup initial messages on startup or mode change
    useEffect(() => {
        if (mode === ChatMode.Builder && initConvertToBoltAction) {
            setMessages([
                {
                    id: "1",
                    role: "user",
                    content: `<boltArtifact id="hello-js" title="the current file">\n${initConvertToBoltAction}\n</boltArtifact>\n\n`,
                },
            ]);
        }
    }, [initConvertToBoltAction, mode]);

    // Update messages when files update in builder mode
    useEffect(() => {
        if (mode === ChatMode.Builder && updateConvertToBoltAction) {
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                if (newMessages.length === 0 || newMessages[newMessages.length - 1].id !== "2") {
                    newMessages.push({
                        id: "2",
                        role: "user",
                        content: `<boltArtifact id="hello-js" title="Currently modified files">\n${updateConvertToBoltAction}\n</boltArtifact>\n\n`,
                    });
                } else {
                    newMessages[newMessages.length - 1].content = `<boltArtifact id="hello-js" title="Currently modified files">\n${updateConvertToBoltAction}\n</boltArtifact>\n\n`;
                }
                return newMessages;
            });
        }
    }, [updateConvertToBoltAction, mode]);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        const messageContainer = document.querySelector('.message-container');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Other effects and handlers remain mostly unchanged...

    const refUuidMessages = useRef<string[]>([]);

    // Load chat history function
    const loadChatHistory = async (uuid: string) => {
        try {
            const records = await db.getByUuid(uuid);
            if (records.length > 0) {
                const latestRecord = records[0];
                if (latestRecord?.data?.messages) {
                    const historyFiles = {};
                    const oldHistoryFiles = {};
                    const basePath = getProjectBasePath();
                    ipcRenderer &&
                        ipcRenderer.invoke(
                            "node-container:set-now-path",
                            basePath ? path.join(basePath, uuid) : ""
                        );
                    latestRecord.data.messages.forEach((message) => {
                        const {files: messageFiles} = parseMessage(message.content);
                        Object.assign(historyFiles, messageFiles);
                    });
                    const assistantRecord = latestRecord.data.messages.filter(e => e.role === "assistant");
                    if (assistantRecord.length > 1) {
                        const oldRecords = assistantRecord[1];
                        const {files: messageFiles} = parseMessage(oldRecords.content);
                        Object.assign(oldHistoryFiles, messageFiles);
                    }
                    if (mode === ChatMode.Builder) {
                        latestRecord.data.messages.push({
                            id: uuidv4(),
                            role: "user",
                            content: `<boltArtifact id="hello-js" title="the current file">\n${convertToBoltAction(historyFiles)}\n</boltArtifact>\n\n`,
                        });
                    }
                    setMessages(latestRecord.data.messages);
                    setChatMessages(latestRecord.data.messages);
                    setFiles(historyFiles);
                    setOldFiles(oldHistoryFiles);
                    clearImages();
                    setIsFirstSend();
                    setIsUpdateSend();
                    resetTerminals();
                }
            } else {
                setMessages([]);
                setChatMessages([]);
                clearImages();
                setIsFirstSend();
                setIsUpdateSend();
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
            toast.error("加载聊天记录失败");
        }
    };

    const [chatUuid, setChatUuid] = useState(() => propUuid || uuidv4());

    // Load history on initial uuid
    useEffect(() => {
        if (propUuid) {
            loadChatHistory(propUuid);
        }
    }, [propUuid]);

    // Update URL when chat uuid changes
    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("chat", chatUuid);
        window.history.replaceState(null, "", url.toString());
    }, [chatUuid]);
    
    const token = useUserStore.getState().token;
    const {openModal} = useLimitModalStore();
    const {enabledMCPs} = useMCPTools();
    const baseChatUrl = `${API_BASE}`;
    const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);

    const {
        messages: realMessages,
        input,
        handleInputChange,
        isLoading,
        setMessages: setChatMessages,
        append,
        setInput,
        stop,
        reload,
    } = useChat({
        api: `${baseChatUrl}/api/chat`,
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: {
            model: baseModal.value,
            mode,
            apiKeys,
            otherConfig: {
                ...otherConfig,
                extra: {
                    ...otherConfig.extra,
                    isBackEnd: otherConfig.isBackEnd,
                    backendLanguage: otherConfig.backendLanguage,
                },
            },
            ...(baseModal.functionCall && mcpTools.length > 0 && {
                tools: mcpTools.map((tool) => ({
                    id: tool.id,
                    name: `${tool.serverName}.${tool.name}`,
                    description: tool.description || "",
                    parameters: tool.inputSchema,
                })),
            }),
        },
        id: chatUuid,
        onResponse: async (response) => {
            if (baseModal.from === "ollama") {
                const reader = response.body?.getReader();
                if (!reader) return;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = new TextDecoder().decode(value);
                    const lines = text
                        .split("\n")
                        .filter((line) => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                setChatMessages((messages) => {
                                    const lastMessage = messages[messages.length - 1];
                                    if (
                                        lastMessage &&
                                        lastMessage.role === "assistant"
                                    ) {
                                        return [
                                            ...messages.slice(0, -1),
                                            {
                                                ...lastMessage,
                                                content:
                                                    lastMessage.content +
                                                    data.message.content,
                                            },
                                        ];
                                    }
                                    return [
                                        ...messages,
                                        {
                                            id: uuidv4(),
                                            role: "assistant",
                                            content: data.message.content,
                                        },
                                    ];
                                });
                            }
                        } catch (e) {
                            console.warn(
                                "Failed to parse Ollama response line:",
                                e,
                            );
                        }
                    }
                }
            }
        },
        onFinish: async (message) => {
            clearImages();
            scrollToBottom();
            try {
                const needParseMessages = [...messages, message].filter(
                    (m) => !refUuidMessages.current.includes(m.id),
                );

                refUuidMessages.current = [
                    ...refUuidMessages.current,
                    ...needParseMessages.map((m) => m.id),
                ];

                if (message) {
                    const { files: messagefiles } = parseMessage(message.content);
                    for (const key in messagefiles) {
                        await updateContent(
                            key,
                            messagefiles[key],
                            false,
                            true,
                        );
                    }
                }

                setIsFirstSend();
                setIsUpdateSend();

                const initMessage = [
                    {
                        id: uuidv4(),
                        role: "user",
                        content: input,
                    },
                ];
                await db.insert(chatUuid, {
                    messages: [...messages, ...initMessage, message],
                    title:
                        [...initMessage, ...messages]
                            .find(
                                (m) =>
                                    m.role === "user" &&
                                    !m.content.includes("<boltArtifact"),
                            )
                            ?.content?.slice(0, 50) ||
                        "New Chat",
                });
            } catch (error) {
                console.error("Failed to save chat history:", error);
            }
            setCheckCount((checkCount) => checkCount + 1);
        },
        onError: (error: any) => {
            const msg = error?.errors?.[0]?.responseBody || String(error);
            console.log("error", error, msg);
            toast.error(msg);
            if (String(error).includes("Quota not enough")) {
                openModal("limit");
            }
            if (String(error).includes("Authentication required")) {
                openModal("login");
            }
            if (baseModal.from === "ollama") {
                toast.error("Ollama 服务器连接失败，请检查配置");
            }
        },
    });

    useEffect(() => {
        if (enabledMCPs && enabledMCPs.length > 0) {
            window.myAPI.mcp.listTools().then((allMCPTools) => {
                const filteredTools = allMCPTools.filter((tool) => {
                    return enabledMCPs.some(
                        (mcp) => mcp.name === tool.serverName,
                    );
                });
                setMcpTools(filteredTools);
            });
        } else {
            setMcpTools([]);
        }
    }, [enabledMCPs]);

    // Listen to chat select event
    useEffect(() => {
        const unsubscribe = eventEmitter.on(
            "chat:select",
            (uuid: string) => {
                if (uuid !== chatUuid) {
                    refUuidMessages.current = [];
                    const newUuid = uuid || uuidv4();
                    setChatUuid(newUuid);
                    if (uuid) {
                        loadChatHistory(uuid);
                    } else {
                        setMessages([]);
                        setChatMessages([]);
                        setFiles({});
                        clearImages();
                        setIsFirstSend();
                        setIsUpdateSend();
                        if (ipcRenderer) {
                            setEmptyFiles();
                            const basePath = getProjectBasePath();
                            ipcRenderer.invoke(
                                "node-container:set-now-path",
                                basePath ? path.join(basePath, newUuid) : "",
                            );
                            setFiles({});
                            clearImages();
                            setIsFirstSend();
                            setIsUpdateSend();
                            resetTerminals();
                        }
                    }
                }
            },
        );

        return () => unsubscribe();
    }, [
        chatUuid,
        setFiles,
        setEmptyFiles,
        clearImages,
        setIsFirstSend,
        setIsUpdateSend,
        resetTerminals,
        setChatMessages,
    ]);

    useEffect(() => {
        if (checkCount >= 1) {
            checkFinish(messages[messages.length - 1]?.content || "", append, t);
            checkExecList(messages);
            setCheckCount(0);
        }
    }, [checkCount, messages, append, t]);

    const {status, type} = useUrlData({append});

    useEffect(() => {
        if (status && type === "sketch") {
            showGuide();
        }
    }, [status, type]);

    const parseTimeRef = useRef(0);

    useEffect(() => {
        if (Date.now() - parseTimeRef.current > 200 && isLoading) {
            setMessages(realMessages as WeMessages);
            parseTimeRef.current = Date.now();

            const needParseMessages = messages.filter(
                (m) => !refUuidMessages.current.includes(m.id)
            );
            parseMessages(needParseMessages);
            scrollToBottom();
        }
        if (errors.length > 0 && isLoading) {
            clearErrors();
        }
        if (!isLoading) {
            setMessages(realMessages as WeMessages);
            createMpIcon(files);
        }
    }, [realMessages, isLoading, errors, clearErrors, files]);

    const [userScrolling, setUserScrolling] = useState(false);
    const userScrollTimeoutRef = useRef<NodeJS.Timeout>();

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const isScrolledToBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10;

        if (!isScrolledToBottom) {
            setUserScrolling(true);
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
            userScrollTimeoutRef.current = setTimeout(() => {
                setUserScrolling(false);
            }, 3000);
        }
    };

    useEffect(() => {
        return () => {
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
        };
    }, []);

    const [isUploading, setIsUploading] = useState(false);

    const filterMessages = messages.filter((e) => e.role !== "system");

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || isUploading) return;
        setIsUploading(true);

        const selectedFiles = Array.from(e.target.files);
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        const validFiles = selectedFiles.filter((file) => {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(t("chat.errors.file_size_limit", {fileName: file.name}));
                return false;
            }
            return true;
        });

        try {
            const uploadResults = await Promise.all(
                validFiles.map(async (file) => {
                    const url = await uploadImage(file);
                    return {
                        id: uuidv4(),
                        file,
                        url,
                        localUrl: URL.createObjectURL(file),
                        status: "done" as const,
                    };
                })
            );

            addImages(uploadResults);
            if (uploadResults.length === 1) {
                toast.success(t("chat.success.images_uploaded"));
            } else {
                toast.success(
                    t("chat.success.images_uploaded_multiple", {
                        count: uploadResults.length,
                    })
                );
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(t("chat.errors.upload_failed"));
        } finally {
            setIsUploading(false);
        }

        e.target.value = "";
    };

    const handleSubmitWithFiles = async (
        _: React.KeyboardEvent,
        text?: string
    ) => {
        if (!text && !input.trim() && uploadedImages.length === 0) return;

        const content = text || input;
        const userCount = realMessages.filter(m => m.role === "user").length;
        const lower = content.toLowerCase();
        const hasFramework = /react|typescript|javascript/.test(lower);
        const hasDesign = /tailwind|antd|mui|bootstrap|chakra/.test(lower);

        if (userCount === 0 && (!hasFramework || !hasDesign)) {
            const questions: string[] = [];
            if (!hasFramework) {
                questions.push("Should this be React using TypeScript or JavaScript?");
            }
            if (!hasDesign) {
                questions.push("Which UI library do you prefer (Tailwind, Antd, etc.)?");
            }
            questions.push("Any other requirements?");

            const newMessages = [
                ...realMessages,
                { id: uuidv4(), role: "user", content },
                { id: uuidv4(), role: "assistant", content: questions.join(" ") }
            ];
            setChatMessages(newMessages);
            setMessages(newMessages as WeMessages);
            setInput("");
            setTimeout(() => {
                scrollToBottom();
            }, 100);
            return;
        }

        try {
            const currentAttachments = uploadedImages.map((img) => ({
                id: img.id,
                name: img.id,
                type: img.file.type,
                localUrl: img.localUrl,
                contentType: img.file.type,
                url: img.url,
            }));

            clearImages();

            append(
                {
                    role: "user",
                    content,
                },
                {
                    experimental_attachments: currentAttachments,
                }
            );
            setInput("");
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to upload files");
        }
    };

    const handleKeySubmit = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitWithFiles(e);
        }
    };

    const handlePaste = async (e: ClipboardEvent) => {
        if (isUploading) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        const hasImages = Array.from(items).some(
            (item) => item.type.indexOf("image") !== -1
        );
        if (hasImages) {
            e.preventDefault();
            setIsUploading(true);

            const imageItems = Array.from(items).filter(
                (item) => item.type.indexOf("image") !== -1
            );

            try {
                const uploadResults = await Promise.all(
                    imageItems.map(async (item) => {
                        const file = item.getAsFile();
                        if (!file) throw new Error("Failed to get file from clipboard");

                        const url = await uploadImage(file);
                        return {
                            id: uuidv4(),
                            file,
                            url,
                            localUrl: URL.createObjectURL(file),
                            status: "done" as const,
                        };
                    })
                );

                addImages(uploadResults);

                if (uploadResults.length === 1) {
                    toast.success(t("chat.success.image_pasted"));
                } else {
                    toast.success(
                        t("chat.success.images_pasted_multiple", {
                            count: uploadResults.length,
                        })
                    );
                }
            } catch (error) {
                console.error("Failed to upload pasted images:", error);
                toast.error(t("chat.errors.paste_failed"));
            } finally {
                setIsUploading(false);
            }
        }
    };

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.addEventListener("paste", handlePaste);
        return () => {
            textarea.removeEventListener("paste", handlePaste);
        };
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isUploading) return;
        setIsUploading(true);

        try {
            const items = Array.from(e.dataTransfer.items);
            const imageItems = items.filter((item) => item.type.startsWith("image/"));

            const uploadResults = await Promise.all(
                imageItems.map(async (item) => {
                    const file = item.getAsFile();
                    if (!file) throw new Error("Failed to get file from drop");

                    const url = await uploadImage(file);
                    return {
                        id: uuidv4(),
                        file,
                        url,
                        localUrl: URL.createObjectURL(file),
                        status: "done" as const,
                    };
                })
            );

            addImages(uploadResults);

            if (uploadResults.length === 1) {
                toast.success("图片已添加到输入框");
            } else {
                toast.success(`${uploadResults.length} 张图片已添加到输入框`);
            }
        } catch (error) {
            console.error("Failed to process dropped images:", error);
            toast.error("添加图片失败");
        } finally {
            setIsUploading(false);
        }
    };

    const showJsx = useMemo(() => {
        return (
            <div
                className="flex-1 overflow-y-auto px-1 py-2 message-container [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onScroll={handleScroll}
            >
                {messages.length === 0 && (
                    <Tips
                        append={append}
                        setInput={setInput}
                        handleFileSelect={handleFileSelect}
                    />
                )}
                <div className="max-w-[640px] w-full mx-auto space-y-3">
                    {filterMessages.map((message, index) => (
                        <MessageItem
                            handleRetry={() => {
                                reload();
                            }}
                            key={`${message.id}-${index}`}
                            message={message}
                            isEndMessage={
                                filterMessages[filterMessages.length - 1].id === message.id
                            }
                            isLoading={isLoading}
                            onUpdateMessage={(messageId, content) => {
                                append({
                                    role: "user",
                                    content: ` ${content?.[0]?.text}`,
                                });
                            }}
                        />
                    ))}

                    {isLoading && (
                        <div className="group" key="loading-indicator">
                            <div
                                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                                <div
                                    className="w-6 h-6 rounded-md bg-[rgba(45,45,45)] text-gray-400 flex items-center justify-center text-xs border border-gray-700/50">
                                    <svg
                                        className="w-4 h-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-32 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-16 h-4 rounded bg-gray-700/50 animate-pulse"/>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        <div className="w-full h-3 rounded bg-gray-700/50 animate-pulse"/>
                                        <div className="w-4/5 h-3 rounded bg-gray-700/50 animate-pulse"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-px"/>
                </div>
            </div>
        );
    }, [messages, isLoading, setInput, handleFileSelect, append, reload]);

    const showGuide = () => setVisible(true);

    const handleFileSelected = () => {
        setVisible(false);
    };

    // Chat UUID state

    return (
        <div
            className="flex h-full flex-col dark:bg-[#18181a] max-w-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {showJsx}
            <ChatInput
                input={input}
                setMessages={setChatMessages}
                append={append}
                messages={messages}
                stopRuning={stop}
                setInput={setInput}
                isLoading={isLoading}
                isUploading={isUploading}
                uploadedImages={uploadedImages}
                baseModal={baseModal}
                handleInputChange={handleInputChange}
                handleKeySubmit={handleKeySubmit}
                handleSubmitWithFiles={handleSubmitWithFiles}
                handleFileSelect={handleFileSelect}
                removeImage={removeImage}
                addImages={addImages}
                setIsUploading={setIsUploading}
                setBaseModal={setBaseModal}
            />
        </div>
    );
};