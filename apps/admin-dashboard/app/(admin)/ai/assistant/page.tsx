"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Loader2, Send, Bot, User, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Hello! I am your AI Assistant. How can I help you manage your agency operations today?" }
  ]);
  const [input, setInput] = React.useState("");

  const chatMutation = useMutation({
    mutationFn: async (payload: { message: string; conversationHistory: Message[] }) => {
      const { data } = await apiClient.post("/ai/chat", payload);
      return data as { reply: string };
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to communicate with assistant.");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");

    // Submit payload matching NestJS AiChatDto
    chatMutation.mutate({
      message: input,
      conversationHistory: updatedMessages,
    });
  };

  const handleClearChat = () => {
    setMessages([
      { role: "assistant", content: "Hello! I am your AI Assistant. How can I help you manage your agency operations today?" }
    ]);
  };

  return (
    <div className="flex flex-col gap-6 h-[80vh]">
      <div className="flex items-center justify-between">
        <PageHeader
          title="AI Assistant Chat"
          breadcrumbs={[{ label: "Technical Assets" }, { label: "AI Workloads" }, { label: "Assistant" }]}
        />
        <Button variant="outline" size="sm" onClick={handleClearChat} className="gap-1.5 h-8">
          <Trash2 className="h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        
        {/* Chat Messages */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 max-w-[80%] text-xs ${
                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-xs border ${
                m.role === "user"
                  ? "bg-primary border-primary text-primary-foreground font-sans font-bold"
                  : "bg-slate-100 border-border text-slate-500"
              }`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`p-3.5 rounded-2xl leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-slate-50 dark:bg-zinc-800/40 text-foreground border border-border rounded-tl-none"
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {chatMutation.isPending && (
            <div className="flex items-start gap-3 max-w-[80%] text-xs mr-auto">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-border text-slate-500 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 text-slate-400 border border-border rounded-tl-none flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Box */}
        <div className="border-t border-border p-4 bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask the AI assistant anything (e.g. Write a followup email to Sanjay about lead status...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs"
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending || !input.trim()} size="sm" className="gap-1.5">
              Send
            </Button>
          </form>
        </div>

      </Card>
    </div>
  );
}
