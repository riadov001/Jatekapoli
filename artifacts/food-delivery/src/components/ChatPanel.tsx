import { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
  id: number;
  orderId: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface ChatPanelProps {
  orderId: number;
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ orderId, open, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const token = localStorage.getItem("jatek_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${base}/api/orders/${orderId}/chat`, { headers });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (!open || !orderId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [open, orderId]);

  // SSE for real-time chat
  useEffect(() => {
    if (!open || !orderId) return;
    const url = `${base}/api/events?channels=${encodeURIComponent(`order:${orderId}`)}`;
    const es = new EventSource(url);
    es.addEventListener("chat_message", (e) => {
      try {
        const msg: ChatMessage = JSON.parse((e as MessageEvent).data);
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {}
    });
    return () => es.close();
  }, [open, orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${base}/api/orders/${orderId}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      }
    } catch {} finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-background rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm mx-0 sm:mx-4 shadow-2xl z-10 flex flex-col"
            style={{ height: "min(480px, 85vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Chat avec le livreur</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
                  <p className="text-xs text-muted-foreground mt-1">Envoyez un message à votre livreur.</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}>
                      {!isMe && (
                        <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border shrink-0 flex gap-2">
              <Input
                placeholder="Écrivez un message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 rounded-xl"
                maxLength={500}
              />
              <Button
                size="icon"
                className="rounded-xl shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
