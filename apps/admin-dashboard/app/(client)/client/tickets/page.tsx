"use client";

import { useState, useEffect } from "react";
import {
  Ticket as TicketIcon,
  Plus,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  X,
  User,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useTickets, useCreateTicket, useAddComment, useTicketComments, type Ticket, type TicketComment } from "@/lib/hooks/useTickets";
import { useWebSocket } from "@/lib/websocket";

export default function ClientTicketsPage() {
  const [activeTicketId, setActiveTicketId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [newReply, setNewReply] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("TECHNICAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  const { data: ticketsData, isLoading, error } = useTickets({ limit: 50 });
  const createTicket = useCreateTicket();
  const addComment = useAddComment();
  const { isConnected, lastMessage, subscribeToTicket } = useWebSocket("");

  const tickets = ticketsData?.data || [];
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(activeTicket?.id || "");
  const comments = commentsData?.data || [];

  // Auto-select first ticket when loaded
  useEffect(() => {
    if (tickets.length > 0 && !activeTicketId) {
      setActiveTicketId(tickets[0].id);
    }
  }, [tickets, activeTicketId]);

  // Subscribe to active ticket updates
  useEffect(() => {
    if (isConnected && activeTicket) {
      subscribeToTicket(activeTicket.id);
    }
  }, [isConnected, activeTicket, subscribeToTicket]);

  // Handle WebSocket updates
  useEffect(() => {
    if (lastMessage?.type === "ticket.updated" || lastMessage?.type === "ticket.assigned") {
      console.log("Ticket update received via WebSocket:", lastMessage);
    }
  }, [lastMessage]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      const newTicket = await createTicket.mutateAsync({
        title,
        description,
        category: category as any,
        priority: priority as any,
        type: "CLIENT_SUPPORT",
      });
      setActiveTicketId(newTicket.id);
      setShowModal(false);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !activeTicket) return;

    try {
      await addComment.mutateAsync({ id: activeTicket.id, content: newReply.trim(), isInternal: false });
      setNewReply("");
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "ASSIGNED":
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      default:
        return "bg-zinc-800 text-zinc-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "URGENT":
        return "bg-rose-500/20 text-rose-400";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-zinc-800 text-zinc-300";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-zinc-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Failed to load tickets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TicketIcon className="w-6 h-6 text-purple-400" /> Support Ticket Center
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

          {tickets.map((ticket: Ticket) => {
            const isSelected = activeTicket?.id === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => setActiveTicketId(ticket.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-purple-900/30 border-purple-500/60 shadow-lg"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-purple-400 font-bold">{ticket.ticketNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(ticket.status)}`}
                  >
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1">{ticket.title}</h3>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                  <span className="capitalize text-zinc-300">{ticket.category.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(ticket.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center text-zinc-400 text-sm py-8">No tickets yet. Create your first ticket!</div>
          )}
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
                      <span className="text-xs font-mono font-bold text-purple-400">{activeTicket.ticketNumber}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-300">
                        {activeTicket.category.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getPriorityColor(activeTicket.priority)}`}
                      >
                        {activeTicket.priority} Priority
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{activeTicket.title}</h2>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(activeTicket.status)}`}
                  >
                    {activeTicket.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Initial Ticket Description */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed mb-6">
                  {activeTicket.description}
                </div>

                {/* Conversation Thread */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {commentsLoading ? (
                    <div className="text-center text-zinc-500 text-xs py-4">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Loading comments...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center text-zinc-500 text-xs py-4">
                      No comments yet. Start the conversation!
                    </div>
                  ) : (
                    comments.map((comment: TicketComment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-xl border text-xs ${
                          comment.isInternal
                            ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                            : "bg-zinc-950/80 border-zinc-800 text-zinc-300"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-white">
                            {comment.user?.name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="leading-relaxed">{comment.content}</p>
                      </div>
                    ))
                  )}
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
                  disabled={createTicket.isPending}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={createTicket.isPending}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="BUG_REPORT">Bug Report</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={createTicket.isPending}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
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
                  disabled={createTicket.isPending}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={createTicket.isPending}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicket.isPending}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
