"use client";

import { useState, useEffect } from "react";
import { Ticket as TicketIcon, CheckCircle2, MessageSquare, Send, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useTickets, useStartWork, useSubmitResolution, useAddComment, useTicketComments, type Ticket, type TicketComment } from "@/lib/hooks/useTickets";
import { useWebSocket } from "@/lib/websocket";

export default function AgentTicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  
  const { data: ticketsData, isLoading, error } = useTickets({ assignedToMe: true, limit: 50 });
  const startWork = useStartWork();
  const submitResolution = useSubmitResolution();
  const addComment = useAddComment();
  const { isConnected, lastMessage, subscribeToTicket } = useWebSocket("");

  const tickets = ticketsData?.data || [];
  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(activeTicket?.id || "");
  const comments = commentsData?.data || [];

  // Auto-select first ticket when loaded
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    // Start work if not already in progress
    if (activeTicket.status === "OPEN" || activeTicket.status === "ASSIGNED") {
      try {
        await startWork.mutateAsync(activeTicket.id);
      } catch (error) {
        console.error("Failed to start work:", error);
      }
    }

    try {
      await addComment.mutateAsync({ id: activeTicket.id, content: replyText.trim(), isInternal: false });
      setReplyText("");
      toast.success("Reply sent to client!");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("Failed to send reply");
    }
  };

  const handleMarkResolved = async (ticketId: string) => {
    try {
      await submitResolution.mutateAsync({ id: ticketId, resolution: "Issue resolved" });
      toast.success("Ticket marked as Resolved!");
    } catch (error) {
      console.error("Failed to resolve ticket:", error);
      toast.error("Failed to resolve ticket");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "URGENT":
        return "bg-rose-500/20 text-rose-400";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "text-emerald-400";
      case "IN_PROGRESS":
        return "text-blue-400";
      default:
        return "text-zinc-400";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-zinc-400">Loading assigned tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Failed to load tickets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TicketIcon className="w-6 h-6 text-blue-400" /> Agent Support Queue
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          URL Path: <span className="font-mono text-blue-400">/agent/tickets</span> · Assigned ticket management for support agents & engineers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[640px]">
        {/* Left List */}
        <div className="lg:col-span-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col gap-3 overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2">
            Assigned Tickets ({tickets.length})
          </h2>
          {tickets.map((t: Ticket) => {
            const isSelected = t.id === activeTicket?.id;
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
                  <span className="font-mono font-bold text-xs text-blue-400">{t.ticketNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(t.priority)}`}
                  >
                    {t.priority}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 line-clamp-1">{t.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t.clientName || "N/A"}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`font-semibold uppercase ${getStatusColor(t.status)}`}>
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center text-zinc-400 text-sm py-8">No assigned tickets</div>
          )}
        </div>

        {/* Right Active Ticket Detail */}
        {activeTicket ? (
          <div className="lg:col-span-7 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-blue-400">{activeTicket.ticketNumber}</span>
                  <span className="text-xs font-semibold text-zinc-400">· {activeTicket.clientName || "N/A"}</span>
                </div>
                <h2 className="text-sm font-bold text-white mt-0.5">{activeTicket.title}</h2>
              </div>
              {activeTicket.status !== "RESOLVED" && activeTicket.status !== "CLOSED" && (
                <button
                  onClick={() => handleMarkResolved(activeTicket.id)}
                  disabled={submitResolution.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Resolve
                </button>
              )}
            </div>

            {/* Description */}
<div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950/40">
               <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">
                 <span className="text-[10px] text-zinc-400 font-semibold uppercase">Initial Problem Description:</span>
                 <p className="text-xs text-zinc-200 mt-1">{activeTicket.description}</p>
               </div>

               {/* Comments Thread */}
               {commentsLoading ? (
                 <div className="text-center text-zinc-500 text-xs py-4">
                   <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /> Loading comments...
                 </div>
               ) : comments.length === 0 ? (
                 <div className="text-center text-zinc-500 text-xs py-4">
                   No comments yet.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {comments.map((comment: TicketComment) => (
                     <div
                       key={comment.id}
                       className={`p-3 rounded-xl border text-xs ${
                         comment.isInternal
                           ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                           : "bg-zinc-800/30 border-zinc-700 text-zinc-200"
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
                   ))}
                 </div>
               )}
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
        ) : (
          <div className="lg:col-span-7 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center">
            <p className="text-zinc-400 text-sm">Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
