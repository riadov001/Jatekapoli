import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, CheckCheck, Package, Tag, Users, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  order_status: <Package className="w-4 h-4 text-primary" />,
  promo: <Tag className="w-4 h-4 text-brand-yellow-foreground" />,
  referral: <Users className="w-4 h-4 text-brand-turquoise" />,
  chat: <MessageSquare className="w-4 h-4 text-purple-500" />,
  system: <Bell className="w-4 h-4 text-muted-foreground" />,
};

export function NotificationBell() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const token = localStorage.getItem("jatek_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${base}/api/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await fetch(`${base}/api/notifications/${id}/read`, { method: "PATCH", headers });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${base}/api/notifications/read-all`, { method: "PATCH", headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotif = async (id: number) => {
    try {
      await fetch(`${base}/api/notifications/${id}`, { method: "DELETE", headers });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - (notifications.find((n) => n.id === id)?.readAt ? 0 : 1)));
    } catch {}
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.readAt) markRead(notif.id);
    const data = notif.data ?? {};
    if (notif.type === "order_status" && data.orderId) {
      setOpen(false);
      setLocation(`/orders/${data.orderId}`);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-xl w-9 h-9 hover:bg-white/40"
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5"
            >
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary text-white rounded-full border-2 border-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-background border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={markAllRead}>
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout lire
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${!notif.readAt ? "bg-primary/4" : ""}`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!notif.readAt ? "bg-primary/10" : "bg-muted"}`}>
                      {typeIcon[notif.type] ?? typeIcon.system}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notif.readAt ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(notif.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                      aria-label="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
