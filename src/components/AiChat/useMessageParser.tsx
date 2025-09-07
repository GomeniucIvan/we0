import { FileAction, StreamingMessageParser } from "./messae";


import { createFileWithContent } from "../WeIde/components/IDEContent/FileExplorer/utils/fileSystem";
import useTerminalStore from "@/stores/terminalSlice";
import type { Message } from "ai";
import extractCodebase from "@/utils/extractCodebase";

class Queue {
  private queue: string[] = [];
  private processing: boolean = false;

  // 添加命令到队列
  push(command: string) {
    this.queue.push(command);
    this.process();
  }

  // 获取队列中的下一个命令
  private getNext(): string | undefined {
    return this.queue.shift();
  }

  // 处理队列
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const command = this.getNext();
        if (command) {
          console.log("执行命令", command);
          await useTerminalStore.getState().getTerminal(0).executeCommand(command);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

export const queue = new Queue();


class List {
  private isRunArray: string[] = [];
  private nowArray: string[] = [];

  // 添加命令到队列
  run(commands: string[]) {
    this.nowArray = commands
    this.process();
  }

  private getCommand(number: number) {
    return this.nowArray?.[number];
  }

  // 判断命令是否已经执行
  private getIsRun(number: number) {
    return this.isRunArray?.[number];
  }

  // 处理队列
  private async process() {
    console.log("this.nowArray", this.nowArray, this.isRunArray);
    for (let i = 0; i < this.nowArray.length; i++) {
      const command = this.getCommand(i);
      const isRuned = this.getIsRun(i);
      if (command && command !== isRuned) {
        console.log("执行命令", command);
        this.isRunArray[i] = command;
        queue.push(command);
      }
    }
  }

  // 清空队列
  clear() {
    this.nowArray = [];
    this.isRunArray = [];
  }
}

export const execList = new List();

const messageParser = new StreamingMessageParser({
  callbacks: {
    onActionStream: async (data) => {
      const action = data.action as FileAction;
      createFileWithContent(action.filePath, action.content, true);

      // Trigger dependency installation when package.json changes.
      if (action.filePath.endsWith("package.json")) {
        queue.push("npm install");
      }
      //   workbenchStore.runAction(data, true);
    },
  },
});


let cachedSummary: string | null = null;

type MessageWithSummary = Message & { summary?: string };

export const parseMessages = async (messages: MessageWithSummary[]) => {
  if (!cachedSummary) {
    try {
      cachedSummary = await extractCodebase();
    } catch {
      cachedSummary = null;
    }
  }

  if (cachedSummary && !messages.find((m) => m.id === "codebase-summary")) {
    messages.unshift({
      id: "codebase-summary",
      role: "system",
      content: cachedSummary,
    });
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role === "assistant") {
      let content = message.content;
      if (typeof content === "string") {
        const [summary, code] = content.split("<!--summary-->");
        if (code !== undefined) {
          message.summary = summary.trim();
          content = code;
          message.content = content;
        }
      }

      // Parse file actions after extracting summary
      messageParser.parse(message.id, content);
    }
  }
};