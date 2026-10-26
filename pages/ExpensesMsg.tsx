import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiFetch } from "../src/constants";

type PaymentMode = "UPI" | "Cash" | "Card" | "Other";

type ExpenseMessage = {
  id?: number | string;
  _id?: number | string;
  groupId?: number | string;
  userId?: number | string;
  createdAt?: string;
  text?: string;
  expense?: unknown;
  expenseData?: unknown;
  data?: unknown;
  title?: unknown;
  money?: unknown;
  amount?: unknown;
  currency?: unknown;
  paymentMode?: unknown;
  location?: unknown;
  note?: unknown;
  paidByUserId?: number | string;
};

type ExpensesMsgProps = {
  message: ExpenseMessage;
  onClose: () => void;
};

type ExpenseDetails = Record<string, unknown>;

type ExpenseForm = {
  title: string;
  money: string;
  currency: string;
  paymentMode: PaymentMode;
  location: string;
  note: string;
};

const paymentModes: PaymentMode[] = ["UPI", "Cash", "Card", "Other"];

async function fetchExpense(mesId: string): Promise<ExpenseDetails> {
  const response = await apiFetch(`/expense/${encodeURIComponent(mesId)}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not fetch expense details.");
  }
  const expense = asRecord(result.data) ?? asRecord(result.expense) ?? asRecord(result);
  if (!expense) throw new Error("Expense details were not returned.");
  return expense;
}

async function updateExpense(expenseId: string, form: ExpenseForm): Promise<void> {
  console.log(expenseId)
  const response = await apiFetch(`/expense/${encodeURIComponent(expenseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...form,
      title: form.title.trim(),
      money: Number(form.money),
      location: form.location.trim(),
      note: form.note.trim(),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not update expense.");
  }
}

async function deleteExpense(expenseId: string): Promise<void> {
  console.log(expenseId)
  const response = await apiFetch(`/expense-del/${encodeURIComponent(expenseId)}`, {
    method: "PUT",
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not delete expense.");
  }
}

function asRecord(value: unknown): ExpenseDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ExpenseDetails;
}

function getExpenseDetails(message: ExpenseMessage): ExpenseDetails {
  console.log(message)
  const parsedText = (() => {
    if (!message.text) return null;
    try {
      return asRecord(JSON.parse(message.text));
    } catch {
      return null;
    }
  })();

  const data: any = asRecord(message.expense) ??
    asRecord(message.expenseData) ??
    asRecord(message.data) ??
    parsedText ??
    message;
  console.log(data)
  return data
}

function getDisplayValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getPaymentMode(value: unknown): PaymentMode {
  return typeof value === "string" && paymentModes.includes(value as PaymentMode)
    ? value as PaymentMode
    : "UPI";
}

export default function ExpensesMsg({ message, onClose }: ExpensesMsgProps) {
  // console.log(message)
  const mesId: any = message?.id
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { data: expenseDetails, isLoading, isError, error, } = useQuery({
    queryKey: ["expense", mesId],
    queryFn: () => fetchExpense(String(mesId)),
    enabled: mesId != null,
  });

  const expenseId = String(expenseDetails?.id)
  const [form, setForm] = useState<ExpenseForm>({
    title: "",
    money: "",
    currency: "INR",
    paymentMode: "UPI",
    location: "",
    note: "",
  });

  const updateMutation = useMutation({
    mutationFn: (updatedForm: ExpenseForm) => updateExpense(expenseId!, updatedForm),
    onSuccess: async () => {
      setIsEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expense", mesId] }),
        queryClient.invalidateQueries({ queryKey: ["messages"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteExpense(mesId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      onClose();
    },
  });

  const isSaving = updateMutation.isPending || deleteMutation.isPending;
  const details: any = expenseDetails ?? getExpenseDetails(message)
  const createdAt = getDisplayValue(details.createdAt);
  const fields = [
    ["Title", getDisplayValue(details.title)],
    ["Amount", getDisplayValue(details.money) ?? getDisplayValue(details.amount)],
    ["Currency", getDisplayValue(details.currency)],
    ["Payment mode", getDisplayValue(details.paymentMode)],
    ["Location", getDisplayValue(details.location)],
    ["Note", getDisplayValue(details.note)],
    ["Paid by user", getDisplayValue(details.paidByUserId)],
    ["Created at", createdAt ? new Date(createdAt).toLocaleString() : null],
  ].filter((field): field is [string, string] => field[1] !== null);
  // console.log("detail" , details , message , expenseDetails , getExpenseDetails(message) , fields)
  const fallbackText = fields.length === 0 ? message.text : null;

  function beginEditing() {
    setForm({
      title: getDisplayValue(details.title) ?? "",
      money: getDisplayValue(details.money) ?? getDisplayValue(details.amount) ?? "",
      currency: getDisplayValue(details.currency) ?? "INR",
      paymentMode: getPaymentMode(details.paymentMode),
      location: getDisplayValue(details.location) ?? "",
      note: getDisplayValue(details.note) ?? "",
    });
    updateMutation.reset();
    deleteMutation.reset();
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseId || isSaving) return;
    updateMutation.mutate(form);
  }

  function handleDelete() {
    if (!expenseId || isSaving) return;
    deleteMutation.mutate();
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onClose]);

  return (
    <div
      aria-labelledby="expense-message-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#354133]/35 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
      role="dialog"
    >
      <section className="my-auto w-full max-w-lg rounded-2xl border border-[#DDE5D8] bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#354133]" id="expense-message-title">Expense details</h2>
            <p className="mt-1 text-sm text-[#71806D]">Expense recorded in this group conversation.</p>
          </div>
          <button
            aria-label="Close expense details"
            className="rounded-lg p-1 text-xl leading-none text-[#71806D] transition hover:bg-[#F7F4ED] hover:text-[#354133]"
            onClick={onClose}
            disabled={isSaving}
            type="button"
          >
            &times;
          </button>
        </div>

        {mesId == null ? (
          <p className="mt-5 text-sm text-red-600" role="alert">Cannot load expense details because this message has no ID.</p>
        ) : isLoading ? (
          <p aria-live="polite" className="mt-5 text-sm text-[#71806D]">Loading expense details...</p>
        ) : isError ? (
          <p className="mt-5 text-sm text-red-600" role="alert">
            {error instanceof Error ? error.message : "Could not fetch expense details."}
          </p>
        ) : isEditing ? (
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-title">Title</label>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-title"
                maxLength={120}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                value={form.title}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-money">Amount</label>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-money"
                min="0.01"
                onChange={(event) => setForm((current) => ({ ...current, money: event.target.value }))}
                required
                step="0.01"
                type="number"
                value={form.money}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-currency">Currency</label>
              <select
                className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] bg-white px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-currency"
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                value={form.currency}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-payment-mode">Payment mode</label>
              <select
                className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] bg-white px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-payment-mode"
                onChange={(event) => setForm((current) => ({ ...current, paymentMode: getPaymentMode(event.target.value) }))}
                value={form.paymentMode}
              >
                {paymentModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-location">Location</label>
              <input
                className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-location"
                maxLength={160}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                value={form.location}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#52614F]" htmlFor="edit-expense-note">Note</label>
              <textarea
                className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#DDE5D8] px-3 py-2.5 text-sm text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
                id="edit-expense-note"
                maxLength={500}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                value={form.note}
              />
            </div>
            {updateMutation.isError && (
              <p className="sm:col-span-2 text-sm text-red-600" role="alert">
                {updateMutation.error.message}
              </p>
            )}
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#63765E] hover:bg-[#F7F4ED] disabled:opacity-50"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#63765E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#52614F] disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : fields.length > 0 ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div className={label === "Note" ? "sm:col-span-2" : ""} key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#8A9785]">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-[#354133]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : fallbackText ? (
          <p className="mt-5 whitespace-pre-wrap break-words rounded-xl bg-[#F7F8F5] p-4 text-sm text-[#354133]">
            {fallbackText}
          </p>
        ) : (
          <p className="mt-5 text-sm text-[#71806D]">No additional expense details are available.</p>
        )}

        {!expenseDetails && (message.userId != null || message.createdAt) && (
          <p className="mt-5 border-t border-[#E7EEE3] pt-4 text-xs text-[#71806D]">
            {message.userId != null && <>Recorded by User {message.userId}</>}
            {message.userId != null && message.createdAt && " · "}
            {message.createdAt && new Date(message.createdAt).toLocaleString()}
          </p>
        )}

        {isConfirmingDelete && !isEditing && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-[#A33A32]">Delete this expense?</p>
            <p className="mt-1 text-sm text-red-700">This action cannot be undone.</p>
            {deleteMutation.isError && (
              <p className="mt-2 text-sm text-red-700" role="alert">{deleteMutation.error.message}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#63765E] hover:bg-white disabled:opacity-50"
                disabled={isSaving}
                onClick={() => {
                  setIsConfirmingDelete(false);
                  deleteMutation.reset();
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#A33A32] px-4 py-2 text-sm font-bold text-white hover:bg-[#862F29] disabled:opacity-50"
                disabled={isSaving}
                onClick={handleDelete}
                type="button"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete expense"}
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              className="rounded-xl border border-[#DDE5D8] px-4 py-2.5 text-sm font-semibold text-[#A33A32] transition hover:bg-[#FFF4F2] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!expenseId || isLoading || isError || isSaving}
              onClick={() => {
                deleteMutation.reset();
                setIsConfirmingDelete(true);
              }}
              type="button"
            >
              Delete
            </button>
            <button
              className="rounded-xl border border-[#9CAF95] px-4 py-2.5 text-sm font-semibold text-[#52614F] transition hover:bg-[#E7EEE3] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!expenseDetails || isSaving}
              onClick={beginEditing}
              type="button"
            >
              Edit
            </button>
            <button
              className="rounded-xl bg-[#63765E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#52614F]"
              onClick={onClose}
              disabled={isSaving}
              type="button"
            >
              Close
            </button>
          </div>
        )}
      </section>
    </div>
  );
}