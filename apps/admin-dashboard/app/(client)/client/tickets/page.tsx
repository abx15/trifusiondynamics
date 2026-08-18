"use client";

import { useState } from "react";
import {
  Ticket,
  Plus,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  X,
  User,
  ShieldAlert,
} from "lucide-react";

interface TicketItem {
  id: string;
  code: string;
  title: string;
  category: "Technical" | "Billing" | "Account" | "Feature";
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  createdAt: string;
  updatedAt: string;
  description: string;
  replies: {
    author: string;
    role: "Client" | "Support Engineer" | "Admin";
    text: string;
    timestamp: string;
  }[];
}

const MOCK_TICKETS: TicketItem[] = [
  {
    id: "t-101",
    code: "TCK-8821",
    title: "Webhook delivery timeout for invoice events",
    category: "Technical",
    priority: "High",
    status: "In Progress",
    createdAt: "2026-08-01 14:30",
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
        author: "Arun Kumar (Lead Engineer)",
        role: "Support Engineer",
        text: "We have isolated the Redis queue worker delay. Deploying a retry buffer fix now.",
        timestamp: "2026-08-02 09:15",
      },
    ],
  },
  {
    id: "t-102",
    code: "TCK-7410",
    title: "Request for additional API keys for staging environment",
    category: "Account",
    priority: "Medium",
    status: "Resolved",
    createdAt: "2026-07-28 11:00",
    updatedAt: "2026-07-29 16:20",
    description: "Need 2 staging environment API keys for our secondary developer team in Bangalore.",
    replies: [
      {
        author: "Sanjay Singhania",
        role: "Client",
        text: "Please generate secondary keys with read-only scope for staging.",
        timestamp: "2026-07-28 11:00",
      },
      {
        author: "Admin Support",
        role: "Admin",
        text: "Keys have been generated and dispatched to your developer inbox securely.",
        timestamp: "2026-07-29 16:20",
      },
    ],
  },
];

export default function ClientTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>(MOCK_TICKETS);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(MOCK_TICKETS[0]);
  const [showModal, setShowModal] = useState(false);
  const [newReply, setNewReply] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TicketItem["category"]>("Technical");
  const [priority, setPriority] = useState<TicketItem["priority"]>("Medium");
  const [description, setDescription] = useState("");

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const newTicket: TicketItem = {
      id: `t-${Date.now()}`,
      code: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      category,
      priority,
      status: "Open",
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
      description,
      replies: [
        {
          author: "Client User",
          role: "Client",
          text: description,
          timestamp: new Date().toLocaleString(),
        },
      ],
    };

    setTickets([newTicket, ...tickets]);
    setActiveTicket(newTicket);
    setShowModal(false);
    setTitle("");
    setDescription("");
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !activeTicket) return;

    const updatedTicket: TicketItem = {
      ...activeTicket,
      updatedAt: new Date().toLocaleString(),
      replies: [
        ...activeTicket.replies,
        {
          author: "Client User",
          role: "Client",
          text: newReply,
          timestamp: new Date().toLocaleString(),
        },
      ],
    };

    setTickets(tickets.map((t) => (t.id === activeTicket.id ? updatedTicket : t)));
    setActiveTicket(updatedTicket);
    setNewReply("");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-purple-400" /> Support Ticket Center
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Raise issues, request features, and track technical SLAs directly with our engineering team.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Ticket
        </button>
      </div>

      {/* Main Ticket Layout: List on Left, Detail Thread on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List Column */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Your Support Tickets ({tickets.length})
          </h2>

          {tickets.map((ticket) => {
            const isSelected = activeTicket?.id === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => setActiveTicket(ticket)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-purple-900/30 border-purple-500/60 shadow-lg"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-purple-400 font-bold">{ticket.code}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ticket.status === "Open"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : ticket.status === "In Progress"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1">{ticket.title}</h3>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                  <span className="capitalize text-zinc-300">{ticket.category}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ticket.updatedAt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ticket Detail & Thread Column */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 flex flex-col h-[650px] justify-between">
              {/* Ticket Header Details */}
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-purple-400">{activeTicket.code}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-300">
                        {activeTicket.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          activeTicket.priority === "Urgent" || activeTicket.priority === "High"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {activeTicket.priority} Priority
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{activeTicket.title}</h2>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activeTicket.status === "In Progress"
                        ? "bg-blue-500/20 text-blue-400"
                        : activeTicket.status === "Resolved"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {activeTicket.status}
                  </span>
                </div>

                {/* Initial Ticket Description */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed mb-6">
                  {activeTicket.description}
                </div>

                {/* Conversation Thread */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {activeTicket.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                        reply.role === "Client"
                          ? "bg-purple-950/30 border-purple-800/40 ml-4"
                          : "bg-zinc-900 border-zinc-800 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-400" /> {reply.author}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {reply.role}
                          </span>
                        </span>
                        <span className="text-zinc-500">{reply.timestamp}</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed pt-1">{reply.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your reply or additional logs..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-3xl bg-zinc-900/30 border border-zinc-800 p-12 text-center text-zinc-500">
              Select a ticket to view the resolution thread.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Raise New Support Ticket
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase">Ticket Title</label>
                <input
                  type="text"
                  placeholder="e.g. API endpoint throwing 500 error"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="Account">Account</option>
                    <option value="Feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase">Detailed Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide steps to reproduce, relevant IDs, or log messages..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
