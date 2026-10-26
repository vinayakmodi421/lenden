import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { apiFetch, debounce, getStoredAdminId, getStoredAdminUsername, socket } from "../src/constants";
import Expenses from "./Expenses";
import ExpensesMsg from "./ExpensesMsg";
import ExpenseDashboard from "./ExpenseDashboard";
import { AddMemberIcon, BackIcon, ExpenseIcon, MessageStatusIcon, MoreOptionsIcon, SendIcon } from "../component/icon";

export type ChatGroup = {
    _id?: string | number;
    id?: string | number;
    name: string;
    description?: string;
    profilePic: string | null;
};

export type ChatGroupMembership = {
    amountPaid: number;
    createdAt: string;
    deactivated: boolean;
    group: ChatGroup;
    groupId: string | number;
    id: string | number;
    isAccepted: boolean;
    isAdmin: boolean;
    owedAmount: number;
    updatedAt: string;
    userId: string | number;
};

type ChatBoxProps = {
    membership: ChatGroupMembership;
    fallbackImage: string;
    onBack: () => void;
    focusMessageId?: string | null;
};

type Message = {
    id?: number | string;
    _id?: number | string;
    groupId: number | string;
    userId: number | string;
    user?: {
        username?: string;
    };
    text: string;
    status: string;
    messageType: string;
    deactivated?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type SearchUser = {
    id?: string;
    _id?: string;
    name?: string;
    username?: string;
};

type Toast = {
    message: string;
    isError: boolean;
};

function getUsernameDisplay(user: SearchUser) {
    if (user.username) return user.username;
    return user.name || "Unknown user";
}


async function fetchMessages(groupId: string): Promise<Message[]> {
    const response: any = await apiFetch(`/message/${groupId}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.message || result.error || "Could not fetch messages.");
    }
    return result.data
}

function getMessageId(message: Message) {
    if (message.id !== undefined && message.id !== null && message.id !== "") return String(message.id);
    if (message._id !== undefined && message._id !== null && message._id !== "") return String(message._id);
    return "";
}

export default function ChatBox({ membership, fallbackImage, onBack, focusMessageId }: ChatBoxProps) {
    const { group } = membership;
    const [message, setMessage] = useState("");
    const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [isExitingGroup, setIsExitingGroup] = useState(false);
    const [exitGroupError, setExitGroupError] = useState("");
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [selectedExpenseMessage, setSelectedExpenseMessage] = useState<Message | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const groupId: any = group.id;
    const queryClient: any = useQueryClient();

    function showToast(message: string, isError = false) {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToast({ message, isError });
        toastTimeout.current = setTimeout(() => setToast(null), 3000);
    }

    useEffect(() => () => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
    }, []);

    const searchUsernames = useMemo(() => debounce(async (query: string) => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setMemberSearchResults([]);
            setIsSearchingMembers(false);
            return;
        }

        setIsSearchingMembers(true);
        try {
            const response: any = await apiFetch(`/search?username=${encodeURIComponent(trimmedQuery)}`);
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error("Could not search users.");
            setMemberSearchResults(result.data);
        } catch (e) {
            setMemberSearchResults([]);
        } finally {
            setIsSearchingMembers(false);
        }
    }, 500), []);

    const { data: messages = [], isLoading, isError } = useQuery({
        queryKey: ["messages", groupId],
        queryFn: () => fetchMessages(groupId),
        enabled: Boolean(groupId),
    });

    useEffect(() => {
        const messageList = messageListRef.current;
        if (!messageList || isLoading) return;

        if (focusMessageId) {
            const focusedMessage = messageList.querySelector<HTMLElement>(
                `[data-message-id="${CSS.escape(focusMessageId)}"]`,
            );
            if (focusedMessage) {
                focusedMessage.scrollIntoView({ block: "center" });
                return;
            }
        }

        messageList.scrollTop = messageList.scrollHeight;
    }, [focusMessageId, groupId, isLoading, messages]);

    function handleViewDashboard() {
        setIsDashboardOpen(true);
    }

    function handleAddUser(user: SearchUser) {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
            showToast("Unable to send request. Please sign in again.", true);
            return;
        }
        let parsedUser: any = JSON.parse(storedUser);
        const receiverUserId = user.id
        const userName = parsedUser.username ?? "";
        const obj: any = {
            senderUserId: getStoredAdminId(),
            receiverUserId,
            groupId: groupId,
            senderName: userName,
            groupName: group.name,
        }
        socket.emit("request", obj)
        showToast(`Request sent to ${getUsernameDisplay(user)}.`);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage || !groupId) return;
        const id = getStoredAdminId();
        if (!id) return;
        const obj: any = {
            groupId,
            userId: id,
            text: trimmedMessage,
            status: "sent",
            messageType: "text",
            user : {
                username : getStoredAdminUsername()
            },
        };
        queryClient.setQueryData(["messages", groupId], (oldData: any) => {
            if (!oldData) return [obj];
            return [...oldData, obj];
        });
        socket.emit("message", obj);
        setMessage("");
    }
    useEffect(() => {
        const messageHandle = (payload: any) => {
            if (!payload || typeof payload !== "object") return;
            const incomingMessage = payload
            queryClient.setQueryData(["messages", groupId], (current: Message[] = []) => {
                return [...current, incomingMessage as Message];
            });
        };

        socket.on("text", messageHandle);
        return () => {
            socket.off("text", messageHandle);
        };
    }, [groupId, queryClient]);

    async function handleExitGroup() {
        if (!membership.id || isExitingGroup) return;

        setIsExitingGroup(true);
        setExitGroupError("");
        try {
            const response: any = await apiFetch(`/exitMember/${encodeURIComponent(membership.id)}`, {
                method: "POST",
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(result.message || result.error || "Could not exit group.");
            }

            await queryClient.invalidateQueries({ queryKey: ["groups"] });
            onBack();
        } catch (error) {
            setExitGroupError(error instanceof Error ? error.message : "Could not exit group.");
        } finally {
            setIsExitingGroup(false);
        }
    }

    return (
        <section className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden border-t border-[#DDE5D8] bg-white shadow-sm">
            {toast && (
                <div
                    aria-live={toast.isError ? "assertive" : "polite"}
                    className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.isError ? "bg-[#A33A32]" : "bg-[#354133]"
                        }`}
                    role={toast.isError ? "alert" : "status"}
                >
                    {toast.message}
                </div>
            )}
            <header className="relative flex items-center gap-3 border-b border-[#E7EEE3] px-4 py-3 sm:px-6">
                <button
                    aria-label="Back to groups"
                    className="rounded-lg p-2 text-[#63765E] transition hover:bg-[#F7F4ED]"
                    onClick={onBack}
                    type="button"
                >
                    <BackIcon />
                </button>
                <img
                    alt={`${group.name} profile`}
                    className="h-11 w-11 rounded-full object-cover"
                    src={group.profilePic || fallbackImage}
                />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold text-[#354133]">{group.name}</h2>
                    <p className="text-xs text-[#8A9785]">Group conversation</p>
                </div>
                {isMemberSearchOpen ? (
                    <div className="relative flex w-44 shrink-0 items-center gap-1 sm:w-64">
                        <label className="sr-only" htmlFor="group-member-search">Search usernames</label>
                        <input
                            autoFocus
                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#DDE5D8] bg-[#F7F8F5] px-3 text-sm text-[#354133] outline-none placeholder:text-[#8A9785] focus:border-[#9CAF95] focus:bg-white focus:ring-2 focus:ring-[#E7EEE3]"
                            id="group-member-search"
                            onChange={(event) => {
                                const value = event.target.value;
                                setMemberSearch(value);
                                setIsSearchingMembers(Boolean(value.trim()));
                                if (!value.trim()) setMemberSearchResults([]);
                                searchUsernames(value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    setIsMemberSearchOpen(false);
                                    setMemberSearch("");
                                    setMemberSearchResults([]);
                                    setIsSearchingMembers(false);
                                }
                            }}
                            placeholder="Search usernames..."
                            type="search"
                            value={memberSearch}
                        />
                        <button
                            aria-label="Close username search"
                            className="h-9 w-8 shrink-0 rounded-lg text-lg leading-none text-[#71806D] hover:bg-[#F7F4ED] hover:text-[#354133]"
                            onClick={() => {
                                setIsMemberSearchOpen(false);
                                setMemberSearch("");
                                setMemberSearchResults([]);
                                setIsSearchingMembers(false);
                            }}
                            type="button"
                        >
                            &times;
                        </button>
                        {memberSearch && (
                            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 w-64 overflow-y-auto rounded-lg border border-[#DDE5D8] bg-white shadow-lg sm:w-full">
                                {isSearchingMembers ? (
                                    <p className="px-3 py-2 text-sm text-[#71806D]">Searching...</p>
                                ) : memberSearchResults.length > 0 ? (
                                    memberSearchResults.map((user, index) => {
                                        const userId = String(user._id ?? user.id ?? user.username ?? `${getUsernameDisplay(user)}-${index}`);

                                        return (
                                            <div className="flex items-center justify-between gap-2 border-b border-[#F0F2EC] px-3 py-2 last:border-b-0" key={userId}>
                                                <p className="truncate text-sm font-medium text-[#354133]">{getUsernameDisplay(user)}</p>
                                                <button
                                                    className="shrink-0 rounded-md bg-[#E7EEE3] px-2.5 py-1.5 text-xs font-semibold text-[#354133] transition hover:bg-[#DCE7D5]"
                                                    onClick={() => handleAddUser(user)}
                                                    type="button"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : memberSearch.trim() ? (
                                    <p className="px-3 py-2 text-sm text-[#71806D]">No usernames found</p>
                                ) : null}
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        aria-label="Search usernames to add to group"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DDE5D8] text-[#63765E] transition hover:bg-[#F7F4ED]"
                        onClick={() => setIsMemberSearchOpen(true)}
                        title="Search usernames"
                        type="button"
                    >
                        <AddMemberIcon />
                    </button>
                )}
                <div className="group relative shrink-0">
                    <button
                        aria-label="More group options"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE5D8] text-[#63765E] transition hover:bg-[#F7F4ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9CAF95]"
                        type="button"
                    >
                        <MoreOptionsIcon />
                    </button>
                    <div className="invisible absolute right-0 top-full z-30 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                        <div className="min-w-44 overflow-hidden rounded-lg border border-[#DDE5D8] bg-white shadow-lg">
                            <button
                                className="block w-full px-4 py-2 text-left text-sm font-semibold text-[#354133] transition hover:bg-[#F7F4ED]"
                                type="button"
                                onClick={handleViewDashboard}
                            >
                                View dashboard
                            </button>
                            <button
                                className="block w-full px-4 py-2 text-left text-sm font-semibold text-[#A33A32] transition hover:bg-[#FFF4F2]"
                                disabled={isExitingGroup}
                                onClick={handleExitGroup}
                                type="button"
                            >
                                {isExitingGroup ? "Exiting..." : "Exit group"}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {exitGroupError && <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{exitGroupError}</p>}
            {isExpenseFormOpen && (
                <Expenses
                    groupId={membership.groupId}
                    groupName={group.name}
                    onClose={() => setIsExpenseFormOpen(false)}
                />
            )}
            {isDashboardOpen && (
                <ExpenseDashboard
                    groupId={groupId}
                    groupName={group.name}
                    onClose={() => setIsDashboardOpen(false)}
                />
            )}
            {selectedExpenseMessage && (
                <ExpensesMsg
                    message={selectedExpenseMessage}
                    onClose={() => setSelectedExpenseMessage(null)}
                />
            )}

            <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto scrollbar-hide bg-[#FBFCFA] p-4 sm:p-6" ref={messageListRef}>
                {isLoading && <p className="text-sm text-[#71806D]">Loading messages...</p>}
                {isError && <p className="text-sm text-red-600">Could not load messages.</p>}
                {!isLoading && !isError && messages.length === 0 && <p className="text-sm text-[#71806D]">No messages yet.</p>}
                {messages.map((currentMessage, i) => {
                    const messageId = getMessageId(currentMessage);
                    const isFocused = Boolean(focusMessageId) && messageId === focusMessageId;

                    return (
                        <div
                            className="flex justify-start"
                            data-message-id={messageId || undefined}
                            key={messageId || `${i}-${currentMessage.user?.username ?? "message"}`}
                        >
                            <div className="w-fit max-w-[80%] sm:max-w-[65%]">
                                <p className="mb-1 px-1 text-xs font-semibold text-[#71806D]">{getUsernameDisplay(currentMessage.user ?? {})}</p>
                                <div className="flex w-fit max-w-full items-end gap-1.5">
                                    <div className={`inline-flex min-w-0 max-w-[calc(100%-3.5rem)] items-end rounded-2xl rounded-bl-sm py-2.5 pl-4 pr-6 text-sm text-[#354133] ${isFocused
                                        ? "bg-[#F4E8C8] ring-2 ring-[#C8A96B] ring-offset-2 ring-offset-[#FBFCFA]"
                                        : "bg-[#E7EEE3]"
                                        }`}>
                                        {currentMessage.messageType?.toLowerCase() === "expense" ? (
                                            <div className="flex min-w-0 items-center gap-3">
                                                <p className="min-w-0 whitespace-pre-wrap break-normal">
                                                    {currentMessage.text || "Expense"}
                                                </p>
                                                <button
                                                    className="shrink-0 rounded-lg border border-[#9CAF95] px-3 py-1.5 text-xs font-semibold text-[#52614F] transition hover:bg-white"
                                                    onClick={() => setSelectedExpenseMessage(currentMessage)}
                                                    type="button"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="min-w-0 whitespace-pre-wrap break-normal">{currentMessage.text}</p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 pb-0.5">
                                        {currentMessage.createdAt && (
                                            <p className="whitespace-nowrap text-[11px] text-[#8A9785]">
                                                {formatMessageDate(currentMessage.createdAt)}
                                            </p>
                                        )}
                                        {currentMessage.status && (
                                            <MessageStatusIcon status={currentMessage.status} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form className="flex items-center gap-2 border-t border-[#E7EEE3] bg-white p-3" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="chat-message">Message</label>
                <input
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#DDE5D8] bg-[#F7F8F5] px-4 text-sm text-[#354133] outline-none placeholder:text-[#8A9785] focus:border-[#9CAF95] focus:bg-white focus:ring-2 focus:ring-[#E7EEE3]"
                    id="chat-message"
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Write a message..."
                    value={message}
                />
                <button
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#63765E] px-4 text-sm font-bold text-white transition hover:bg-[#52614F] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!message.trim()}
                    type="submit"
                >
                    <SendIcon />
                    <span className="hidden sm:inline">Send</span>
                </button>
                <button
                    aria-label="Add expense"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#C7D3C0] bg-[#F7F8F5] px-3 text-sm font-bold text-[#63765E] transition hover:bg-[#E7EEE3]"
                    onClick={async () => {
                        try {
                            const response = await apiFetch(`/showMember/${encodeURIComponent(String(groupId))}`);
                            const result = await response.json().catch(() => ({}));
                            console.log("showMember output:", result);
                        } catch (error) {
                            console.error("showMember request failed:", error);
                        }
                        setIsExpenseFormOpen(true);
                    }}
                    type="button"
                >
                    <ExpenseIcon />
                    <span className="hidden sm:inline">Expense</span>
                </button>
            </form>
        </section>
    );
}

function formatMessageDate(date?: string) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

