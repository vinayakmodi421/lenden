import { useEffect, useState } from "react";
import { apiFetch } from "../src/constants";

type MemberStat = {
    id: number | string;
    userId: number | string;
    groupId: number | string;
    isAdmin: boolean;
    isAccepted: boolean;
    owedAmount: string;
    amountPaid: string;
    deactivated: boolean;
    createdAt: string;
    updatedAt: string;
    user: { username: string };
};

type Props = {
    groupId: string | number;
    groupName: string;
    onClose: () => void;
};

export default function ExpenseDashboard({ groupId, groupName, onClose }: Props) {
    const [data, setData] = useState<MemberStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchDashboard() {
            try {
                setIsLoading(true);
                setError("");
                const res = await apiFetch(`/expenses/dashboard/${groupId}`);
                const json = await res.json();
                if (json.status === 200 || json.data) {
                    setData(json.data ?? []);
                } else {
                    setError(json.message || "Failed to load dashboard.");
                }
            } catch {
                setError("Something went wrong.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboard();
    }, [groupId]);

    const totalPaid = data.reduce((sum, m) => sum + parseFloat(m.amountPaid || "0"), 0);
    const totalOwed = data.reduce((sum, m) => sum + parseFloat(m.owedAmount || "0"), 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: "90vh" }}
            >
                {/* Drag handle (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="h-1 w-10 rounded-full bg-[#DDE5D8]" />
                </div>

                {/* Header */}
                <div className="bg-gradient-to-br from-[#2A3428] to-[#546050] px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-[#9CAF95] uppercase tracking-widest mb-1">
                                Expense Dashboard
                            </p>
                            <h2 className="text-xl font-bold text-white leading-tight truncate">{groupName}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                            type="button"
                            aria-label="Close dashboard"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {!isLoading && !error && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                { label: "Total Paid", value: totalPaid.toFixed(2), color: "text-white" },
                                { label: "Total Owed", value: totalOwed.toFixed(2), color: "text-amber-300" },
                                { label: "Members", value: String(data.length), color: "text-white" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5 text-center">
                                    <p className="text-[10px] font-medium text-[#9CAF95] mb-0.5">{label}</p>
                                    <p className={`text-base font-bold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="h-7 w-7 rounded-full border-[3px] border-[#9CAF95] border-t-transparent animate-spin" />
                            <p className="text-sm text-[#71806D]">Loading…</p>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="flex items-center justify-center py-12 px-6">
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && data.length === 0 && (
                        <div className="flex items-center justify-center py-12 px-6">
                            <p className="text-sm text-[#71806D]">No members found.</p>
                        </div>
                    )}

                    {!isLoading && !error && data.length > 0 && (
                        <ul className="divide-y divide-[#F0F3EE]">
                            {data.map((member) => {
                                const paid = parseFloat(member.amountPaid || "0");
                                const owed = parseFloat(member.owedAmount || "0");
                                const net = paid - owed;
                                const isSettled = owed === 0;
                                const total = paid + owed;

                                return (
                                    <li key={member.id} className="flex items-center gap-3 px-5 py-4 hover:bg-[#F7F9F6] transition-colors">
                                        {/* Avatar */}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#546050] to-[#9CAF95] text-white font-bold text-sm select-none">
                                            {member.user.username.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-semibold text-[#2A3428] text-sm truncate">
                                                    {member.user.username}
                                                </p>
                                                {member.isAdmin && (
                                                    <span className="rounded-full bg-[#E7EEE3] px-1.5 py-0.5 text-[9px] font-bold text-[#546050] uppercase tracking-wide">
                                                        Admin
                                                    </span>
                                                )}
                                                {isSettled && (
                                                    <span className="rounded-full bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                                                        Settled
                                                    </span>
                                                )}
                                            </div>
                                            {total > 0 && (
                                                <div className="mt-1.5 h-1 w-full rounded-full bg-[#EEF2EC] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[#546050] to-[#9CAF95]"
                                                        style={{ width: `${Math.min(100, (paid / total) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Amounts */}
                                        <div className="text-right shrink-0 space-y-0.5">
                                            <p className="text-[11px] text-[#71806D]">
                                                Paid <span className="font-semibold text-[#2A3428]">{paid.toFixed(2)}</span>
                                            </p>
                                            <p className="text-[11px] text-[#71806D]">
                                                Owes{" "}
                                                <span className={`font-semibold ${owed > 0 ? "text-red-500" : "text-[#2A3428]"}`}>
                                                    {owed.toFixed(2)}
                                                </span>
                                            </p>
                                            <p className={`text-[10px] font-bold tabular-nums ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {net >= 0 ? net.toFixed(2) : Math.abs(net).toFixed(2)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#EEF2EC] px-5 py-4 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-[#2A3428] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#546050] active:scale-[0.98]"
                        type="button"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
