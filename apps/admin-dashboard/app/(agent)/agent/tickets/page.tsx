"use client";

import { useState } from "react";
import { Ticket, CheckCircle2, MessageSquare, Send, Clock, ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast";

interface WorkerTicket {
  id: string;
  code: string;
  client: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved";
  createdAt: string;
  messages: Array<{ sender: string; time: string; text: string }>;
}

const INITIAL_WORKER_TICKETS: WorkerTicket[] = [
  {
    id: "wt-1",
    code: "TCK-8821",
    client: "Apex Retail Solutions",
    title: "Webhook delivery timeout for invoice events",
    description: "Our payment gateway webhooks are failing with HTTP 504 gateway timeout after 30 seconds.",
    priority: "High",
    status: "In Progress",
    createdAt: "Today 09:30",
    messages: [
      { sender: "Sanjay (Client)", time: "09:30 AM", text: "Webhook delivery timeout for invoice events." },
      { sender: "Jane Agent", time: "10:15 AM", text: "Investigating the API payload logs now." },
    ],
  },
  {
    id: "wt-2",
    code: "TCK-9042",
    client: "Vishwa Ventures",
    title: "PDF Extraction OCR table format alignment issue",
    description: "Financial tables extracted from multi-page PDFs are losing cell border alignments.",
    priority: "Urgent",
    status: "Open",
    createdAt: "Today 11:15",
    messages: [
      { sender: "Rajesh (Client)", time: "11:15 AM", text: "Tables in extracted PDF are distorted." },
    ],
  },
];

export default function AgentTicketsPage() {
  const [tickets, setTickets] = useState<WorkerTicket[]>(INITIAL_WORKER_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("wt-1");
  const [replyText, setReplyText] = useState("");

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newMsg = {
      sender: "Jane Agent",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: replyText.trim(),
    };

    setTickets(
      tickets.map((t) =>
        t.id === activeTicket.id
          ? { ...t, status: "In Progress", messages: [...t.messages, newMsg] }
          : t
      )
    );

    setReplyText("");
    toast.success("Reply sent to client!");
  };

  const handleMarkResolved = (ticketId: string) => {
    setTickets(
      tickets.map((t) => (t.id === ticketId ? { ...t, status: "Resolved" } : t))
    );
    toast.success("Ticket marked as Resolved!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Ticket className="w-6 h-6 text-blue-400" /> Agent Support Queue
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          URL Path: <span className="font-mono text-blue-400">/agent/tickets</span> · Assigned ticket management for support agents & engineers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[640px]">
        {/* Left List */}
        <div className="lg:col-span-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2">Assigned Tickets ({tickets.length})</h2>
          {tickets.map((t) => {
            const isSelected = t.id === activeTicket.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-500/40"
                    : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-400">{t.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.priority === "Urgent"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 line-clamp-1">{t.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t.client}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.createdAt}
                  </span>
                  <span
                    className={`font-semibold uppercase ${
                      t.status === "Resolved" ? "text-emerald-400" : "text-blue-400"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Ticket Detail */}
        <div className="lg:col-span-7 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-blue-400">{activeTicket.code}</span>
                <span className="text-xs font-semibold text-zinc-400">· {activeTicket.client}</span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">{activeTicket.title}</h2>
            </div>
            {activeTicket.status !== "Resolved" && (
              <button
                onClick={() => handleMarkResolved(activeTicket.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve
              </button>
            )}
          </div>

          {/* Conversation Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950/40">
            <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Initial Problem Description:</span>
              <p className="text-xs text-zinc-200 mt-1">{activeTicket.description}</p>
            </div>

            {activeTicket.messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                  m.sender.includes("Agent")
                    ? "ml-auto bg-blue-600 text-white rounded-br-none"
                    : "bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-bold text-[10px] opacity-80">{m.sender}</span>
                  <span className="text-[9px] opacity-60">{m.time}</span>
                </div>
                <p>{m.text}</p>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex gap-2">
            <input
              type="text"
              placeholder="Type your response to the client..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
