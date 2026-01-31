"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, MarketContext } from "@/types/chat";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  market: MarketContext;
}

export default function AIChatPanel({ isOpen, onClose, market }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const newUserMsg: ChatMessage = { role: "user", content: userMessage };
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, market }),
        });

        if (!response.ok || !response.body) throw new Error("Failed to get response");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, market]
  );

  useEffect(() => {
    if (isOpen && !hasInitialized && messages.length === 0) {
      setHasInitialized(true);
      sendMessage(
        "Analyze this prediction market. Search the web for the latest relevant information and give me your assessment."
      );
    }
  }, [isOpen, hasInitialized, messages.length, sendMessage]);

  useEffect(() => {
    if (isOpen && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [isOpen, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#0f0f11] border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Icon
              icon="solar:magic-stick-3-linear"
              width={20}
              className="text-[#FACC15]"
            />
            <span className="text-white font-medium text-sm">AI Market Analysis</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon
              icon="solar:close-circle-outline"
              width={22}
              className="text-slate-400"
            />
          </button>
        </div>

        {/* Market context bar */}
        <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] shrink-0">
          <p className="text-xs text-slate-400 truncate">{market.question}</p>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-emerald-400">
              YES {market.yesProbability.toFixed(0)}%
            </span>
            <span className="text-red-400">
              NO {market.noProbability.toFixed(0)}%
            </span>
            <span className="text-slate-500">
              {(market.totalYesAmount + market.totalNoAmount).toFixed(2)} SOL pool
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[#FACC15] text-neutral-900">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white/5 text-slate-300 border border-white/5 overflow-hidden">
                  {msg.content ? (
                    <div className="ai-markdown break-words overflow-wrap-anywhere">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#FACC15] hover:underline break-all"
                            >
                              {children}
                            </a>
                          ),
                          strong: ({ children }) => (
                            <strong className="text-white font-semibold">{children}</strong>
                          ),
                          h1: ({ children }) => (
                            <h3 className="text-white font-semibold text-base mt-3 mb-1">{children}</h3>
                          ),
                          h2: ({ children }) => (
                            <h3 className="text-white font-semibold text-sm mt-3 mb-1">{children}</h3>
                          ),
                          h3: ({ children }) => (
                            <h4 className="text-white font-semibold text-sm mt-2 mb-1">{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-slate-300">{children}</li>
                          ),
                          code: ({ children }) => (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-[#FACC15]">
                              {children}
                            </code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[#FACC15]/50 pl-3 italic text-slate-400 my-2">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-slate-400">
                      <Icon
                        icon="solar:refresh-circle-outline"
                        width={16}
                        className="animate-spin"
                      />
                      Searching the web & analyzing...
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-white/10 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this market..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="p-3 bg-[#FACC15] text-neutral-900 rounded-xl hover:bg-[#FACC15]/90 transition-colors disabled:opacity-50"
            >
              <Icon icon="solar:arrow-up-outline" width={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
