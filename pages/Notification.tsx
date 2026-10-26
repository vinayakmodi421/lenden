import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getStoredAdminId, socket } from "../src/constants";


type NotificationItem = {
  id: number | string;
  userId: number | string;
  type: "request" | "expense" | "general";
  title: string;
  description: string;
  requestId: number | string;
  expenseId: number | string;
  request: {
    id: number | string;
    senderUserId: number | string;
    receiverUserId: number | string;
    groupId: number | string;
    isAdded: boolean;
    deactivated: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  expense: {
    id: number | string;
    title: string;
    money: number | string;
    currency: string;
    groupId: number | string;
    msgId: number | string;
  } | null;
  groupId: number | string | null;
  imageUrl: string | null;
  isRead: boolean;
  deactivated: boolean;
  createdAt: string;
  updatedAt: string;
};

async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const response: any = await apiFetch(`/notifications/${encodeURIComponent(userId)}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not fetch notifications.");
  }
  console.log(result);
  if (Array.isArray(result.data)) return result.data;
  return [];
}

function getNotificationGroupId(notification: NotificationItem): string | null {
  if (notification.groupId) return String(notification.groupId)
  return null
}

export default function Notification() {
  const navigate = useNavigate();
  const userId = getStoredAdminId();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading, isError, error } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId),
    enabled: Boolean(userId),
  });
  const sortedNotifications = [...notifications].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );

  useEffect(() => {
    if (!userId) return;

    const handleNotification = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const notification = payload as NotificationItem;
      if (!notification || String(notification.userId) !== String(userId)) return;

      queryClient.setQueryData<NotificationItem[]>(["notifications", userId], (current = []) => {
        if (current.some((item) => String(item.id) === String(notification.id))) return current;
        return [notification, ...current];
      });
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [queryClient, userId]);
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-[#DDE5D8] pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
      </div>

      {!userId && <p className="mt-6 text-[#71806D]">Sign in to view your notifications.</p>}
      {userId && isLoading && <p className="mt-6 text-[#71806D]">Loading notifications...</p>}
      {userId && isError && (
        <p className="mt-6 text-red-600">
          {error instanceof Error ? error.message : "Could not load notifications."}
        </p>
      )}
      {userId && !isLoading && !isError && notifications.length === 0 && (
        <p className="mt-6 text-[#71806D]">You are all caught up.</p>
      )}

      {notifications.length > 0 && (
        <ul className="mt-2 space-y-1">
          {sortedNotifications.map((notification) => (
            <li className={`box-border flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-[#DDE5D8] p-4 sm:flex-row sm:items-center sm:gap-4 ${notification.isRead ? "bg-white" : "bg-[#F7F8F5]"}`} key={notification.id}>
              {notification.imageUrl && (
                <img
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  src={notification.imageUrl}
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="min-w-0 font-semibold text-[#354133] [overflow-wrap:anywhere]">
                  {notification.title}
                  <time className="ml-2 whitespace-nowrap text-sm font-normal text-[#71806D]" dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </time>
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#52614F] [overflow-wrap:anywhere]">
                  {notification.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 self-end sm:self-center">
                {notification.type === "request" && (
                  <button
                    className="min-h-10 whitespace-nowrap rounded-lg bg-[#63765E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#52614F] disabled:cursor-default disabled:opacity-70"
                    disabled={notification.request?.isAdded}
                    onClick={() => socket.emit("accept", { ...notification, userId })}
                    type="button"
                  >
                    {notification.request?.isAdded ? "Added" : "Accept"}
                  </button>
                )}
                {notification.type === "expense" && notification.expense && (
                  <button
                    className="min-h-10 whitespace-nowrap rounded-lg border border-[#9CAF95] px-4 py-2 text-sm font-semibold text-[#52614F] transition hover:bg-[#E7EEE3] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!getNotificationGroupId(notification)}
                    onClick={() => {
                      const groupId = getNotificationGroupId(notification);
                      if (!groupId) return;
                      const messageId = notification.expense?.msgId;
                      const chatPath = `/chat/${encodeURIComponent(groupId)}`;
                      navigate(`${chatPath}?message=${encodeURIComponent(String(messageId))}`,
                      );
                    }}
                    type="button"
                  >
                    View
                  </button>
                )}
                {!notification.isRead && (
                  <span aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#63765E]" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
