"use client";

import { useState } from "react";
import { Ticket, CheckCircle2, Clock, Send, ShieldCheck, User } from "lucide-react";

interface WorkerTicket {
  id: string;
  code: string;
  clientName: string;
  title: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved";
  assignedTo: string;
  updatedAt: string;
  description: string;
  replies: {
    author: string;
    role: "Client" | "Support Engineer";
    text: string;
    timestamp: string;
  }[];
}

const INITIAL_WORKER_TICKETS: WorkerTicket[] = [
  {
    id: "wt-101",
    code: "TCK-8821",
    clientName: "Apex Retail Solutions (Sanjay)",
    title: "Webhook delivery timeout for invoice events",
    priority: "High",
    status: "In Progress",
    assignedTo: "Jane Employee (You)",
    updatedAt: "2026-08-02 09:15",
    description: "Our payment gateway webhooks are timing out after 5000ms when processing multi-tenant payloads.",
    replies: [
      {
        author: "Sanjay Singhania",
        role: "Client",
        text: "We noticed webhook retries spiking around 2 PM yesterday.",
        timestamp: "2026-08-01 14:30",
      },
      {
        author: "Jane Employee",
        role: "Support Engineer",
        text: "Inspecting NestJS webhook dispatcher queue and Redis memory configuration.",
        timestamp: "2026-08-02 09:15",
      },
    ],
  },
];

export default function WorkerTicketsPage() {
  const [tickets, setTickets] = useState<WorkerTicket[]>(INITIAL_WORKER_TICKETS);
  const [activeTicket, setActiveTicket] = useState<WorkerTicket | null>(INITIAL_WORKER_TICKETS[0]);
  const [replyText, setReplyText] = useState("");

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    const updated: WorkerTicket = {
      ...activeTicket,
      updatedAt: new Date().toLocaleString(),
      replies: [
        ...activeTicket.replies,
        {
          author: "Jane Employee (Worker)",
          role: "Support Engineer",
          text: replyText,
          timestamp: new Date().toLocaleString(),
        },
      ],
    };

    setTickets(tickets.map((t) => (t.id === activeTicket.id ? updated : t)));
    setActiveTicket(updated);
    setReplyText("");
  };

  const handleStatusChange = (newStatus: WorkerTicket["status"]) => {
    if (!activeTicket) return;
    const updated = { ...activeTicket, status: newStatus };
    setTickets(tickets.map((t) => (t.id === activeTicket.id ? updated : t)));
    setActiveTicket(updated);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Assigned Support Tickets
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Resolve issues assigned to your engineering queue, post resolution technical logs, and update status.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-semibold">
          Worker Queue Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List Left */}
        <div className="lg:col-span-5 space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setActiveTicket(ticket)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                activeTicket?.id === ticket.id
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 shadow-md"
                  : "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{ticket.code}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  {ticket.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Client: {ticket.clientName}</p>
            </div>
          ))}
        </div>

        {/* Ticket Workspace Detail Right */}
        <div className="lg:col-span-7">
          {activeTicket && (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {activeTicket.code}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{activeTicket.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange("In Progress")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      activeTicket.status === "In Progress"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange("Resolved")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      activeTicket.status === "Resolved"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                {activeTicket.description}
              </div>

              {/* Thread */}
              <div className="space-y-3">
                {activeTicket.replies.map((reply, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white text-[11px]">
                      <span>{reply.author}</span>
                      <span className="text-slate-400 dark:text-zinc-500 font-normal">{reply.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300">{reply.text}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter engineer response or update code fix..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Reply
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
