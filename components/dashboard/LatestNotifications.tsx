"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Notification {
  id: number;
  unique_code?: string;
  title?: string;
  name?: string;
  deliveryDate?: string;
  created_at?: string;
}

interface LatestNotificationsProps {
  siteId: string;
}

function formatTimeAgo(date: string | undefined): string {
  if (!date) return "Sconosciuto";
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: it,
    });
  } catch {
    return "Sconosciuto";
  }
}

function generateNotificationMessage(task: Notification): string {
  const code = task.unique_code || task.id;
  const title = task.title || task.name || "Commessa";
  
  // Check if task is delayed
  if (task.deliveryDate) {
    const deliveryDate = new Date(task.deliveryDate);
    const now = new Date();
    if (deliveryDate < now) {
      const daysLate = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
      return `Commessa #${code} ferma in prod. (Materiale mancante)`;
    }
  }
  
  // Default notification
  return `Commessa #${code} - ${title}`;
}

export default function LatestNotifications({
  siteId,
}: LatestNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/tasks/notifications?siteId=${siteId}`);
        if (response.ok) {
          const data = await response.json();
          // Sort by created_at descending and take first 4
          const sorted = (data || [])
            .sort((a: Notification, b: Notification) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 4);
          setNotifications(sorted);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    if (siteId) {
      fetchNotifications();
    }
  }, [siteId]);

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">Ultime notifiche</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">Ultime notifiche</h3>
        </div>
        <p className="text-sm text-muted-foreground">Nessuna notifica disponibile</p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">Ultime notifiche</h3>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {generateNotificationMessage(notification)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimeAgo(notification.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
