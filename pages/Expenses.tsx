import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { getStoredAdminId, socket } from "../src/constants";

type PaymentMode = "UPI" | "Cash" | "Card" | "Other";

type ExpenseForm = {
  title: string;
  amount: string;
  currency: string;
  note: string;
  location: string;
  paymentMode: PaymentMode;
};

type ExpensePayload = Omit<ExpenseForm, "amount"> & {
  amount: number;
  groupId: string | number;
  userId: string;
};

type ExpensesProps = {
  groupId: string | number;
  groupName: string;
  onClose: () => void;
};

const initialExpenseForm: ExpenseForm = {
  title: "",
  amount: "",
  currency: "INR",
  note: "",
  location: "",
  paymentMode: "UPI",
};

async function sendExpense(expense: ExpensePayload): Promise<void> {
  if (!socket.connected) {
    throw new Error("Connection unavailable. Please try again.");
  }
  console.log(expense)
  socket.emit("expense", expense);
}

export default function Expenses({ groupId, groupName, onClose }: ExpensesProps) {
  // console.log(groupId , groupName)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(initialExpenseForm);
  const [submitError, setSubmitError] = useState("");

  const createExpenseMutation = useMutation({
    mutationFn: sendExpense,
    onSuccess: () => {
      setExpenseForm(initialExpenseForm);
      onClose();
    },
  });

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !createExpenseMutation.isPending) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [createExpenseMutation.isPending, onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const userId = getStoredAdminId();
    if (!userId) {
      setSubmitError("Unable to save expense. Please sign in again.");
      return;
    }

    createExpenseMutation.mutate({
      ...expenseForm,
      title: expenseForm.title.trim(),
      amount: Number(expenseForm.amount),
      note: expenseForm.note.trim(),
      location: expenseForm.location.trim(),
      groupId,
      userId,
    });
  }

  function closeForm() {
    if (createExpenseMutation.isPending) return;
    setExpenseForm(initialExpenseForm);
    setSubmitError("");
    createExpenseMutation.reset();
    onClose();
  }

  return (
    <div
      aria-labelledby="add-expense-title"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#354133]/35 px-4 py-6 motion-safe:animate-[expense-overlay-in_180ms_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeForm();
      }}
      role="dialog"
    >
      <form
        className="my-auto w-full max-w-md rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-xl sm:p-5 motion-safe:animate-[expense-form-in_180ms_ease-out]"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#354133]" id="add-expense-title">Add an expense</h2>
            <p className="mt-1 text-sm text-[#71806D]">Record an expense for {groupName}.</p>
          </div>
          <button
            aria-label="Close add expense form"
            className="rounded-lg p-1 text-xl leading-none text-[#71806D] transition hover:bg-[#F7F4ED] hover:text-[#354133] disabled:opacity-50"
            disabled={createExpenseMutation.isPending}
            onClick={closeForm}
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-title">Title</label>
            <input
              autoFocus
              className="mt-2 h-10 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-title"
              maxLength={120}
              onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))}
              required
              value={expenseForm.title}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-amount">Amount</label>
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-amount"
              min="0.01"
              onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
              required
              step="0.01"
              type="number"
              value={expenseForm.amount}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-currency">Currency</label>
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#DDE5D8] bg-white px-3 text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-currency"
              onChange={(event) => setExpenseForm((current) => ({ ...current, currency: event.target.value }))}
              value={expenseForm.currency}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-payment-mode">Payment Mode</label>
            <select
              className="mt-2 h-10 w-full rounded-xl border border-[#DDE5D8] bg-white px-3 text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-payment-mode"
              onChange={(event) => setExpenseForm((current) => ({ ...current, paymentMode: event.target.value as PaymentMode }))}
              value={expenseForm.paymentMode}
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-location">Location <span className="font-normal text-[#8A9785]">(optional)</span></label>
            <input
              className="mt-2 h-10 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-location"
              maxLength={160}
              onChange={(event) => setExpenseForm((current) => ({ ...current, location: event.target.value }))}
              value={expenseForm.location}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-[#52614F]" htmlFor="expense-note">Note <span className="font-normal text-[#8A9785]">(optional)</span></label>
            <textarea
              className="mt-2 h-16 w-full resize-none rounded-xl border border-[#DDE5D8] px-3 py-2 text-sm text-[#354133] outline-none transition focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]"
              id="expense-note"
              maxLength={500}
              onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))}
              value={expenseForm.note}
            />
          </div>
        </div>

        {(submitError || createExpenseMutation.isError) && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {submitError || createExpenseMutation.error?.message || "Could not save the expense."}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#63765E] transition hover:bg-[#F7F4ED] disabled:opacity-50"
            disabled={createExpenseMutation.isPending}
            onClick={closeForm}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#63765E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#52614F] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createExpenseMutation.isPending}
            type="submit"
          >
            {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
