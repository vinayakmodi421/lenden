import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../src/constants";
import { EyeIcon, LeafIcon } from "./icon";

type RegisterForm = {
  username: string;
  email: string;
  phoneNo: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof RegisterForm, string>>;

const initialForm: RegisterForm = {
  username: "",
  email: "",
  phoneNo: "",
  password: "",
  confirmPassword: "",
};

type RegisterPayload = Omit<RegisterForm, "confirmPassword">;

const registerUser = async (data: RegisterPayload) => {
  const response = await apiFetch("/user-register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  const apiMessage = result.message || result.error || "Registration failed. Please try again.";
  const failed = !response.ok || result.status === 400 || result.status === 409 || result.success === false;

  if (failed) {
    const error = new Error(apiMessage) as Error & { field?: string };
    if (result.status === 409 || result.code === 11000 || /email.*(already|exist|duplicate)|duplicate.*email|already registered/i.test(apiMessage)) {
      error.field = "email";
    }
    throw error;
  }

  return result;
};

export default function Register() {
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      navigate("/verify-email", { state: { email: form.email } });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Registration failed. Please try again.";
      if (error instanceof Error && "field" in error && (error as Error & { field?: string }).field === "email") {
        setErrors((current) => ({ ...current, email: errorMessage }));
      }
      setMessage(errorMessage);
    },
  });

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
      nextErrors.username = "Use 3–20 letters, numbers, or underscores only.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!/^[6-9]\d{9}$/.test(form.phoneNo)) {
      nextErrors.phoneNo = "Enter a valid 10-digit Indian phone number.";
    }
    if (form.password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    } else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(form.password)) {
      nextErrors.password = "Use uppercase, lowercase, and a number.";
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setMessage("");
    registerMutation.mutate({
      username: form.username,
      email: form.email,
      phoneNo: form.phoneNo,
      password: form.password,
    });
  };

  const inputClass = (hasError?: string) => `w-full rounded-xl border bg-[#F7F4ED] px-4 py-3 text-[#354133] outline-none transition placeholder:text-[#8FA28A] focus:ring-4 ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-[#C7D3C0] focus:border-[#8FA28A] focus:ring-[#C7D3C0]/50"}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F4ED] px-4 py-10 text-[#354133]">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(77,92,74,0.16)] md:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#8FA28A] p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#C7D3C0]/40" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#C8A96B]/45" />

          <div className="relative">
            <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <LeafIcon />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#F7F4ED]/80">Welcome</p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Create your account and get started.</h1>
            <p className="mt-5 max-w-sm leading-7 text-[#F7F4ED]/85">Join us with a simple and secure registration experience.</p>
          </div>

          <p className="relative text-sm text-[#F7F4ED]/70">Simple • Secure • Easy to use</p>
        </aside>

        <div className="p-6 sm:p-10 lg:p-14">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C7D3C0] text-[#4F624B] md:hidden">
              <LeafIcon />
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
            <p className="mt-2 text-sm text-[#71806D]">Enter your details to register.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Username" error={errors.username}>
              <input className={inputClass(errors.username)} type="text" value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder="vinayak_mod10" autoComplete="username" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email address" error={errors.email}>
                <input className={inputClass(errors.email)} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" autoComplete="email" />
              </Field>

              <Field label="Phone number" error={errors.phoneNo}>
                <div className="flex">
                  <span className="flex items-center rounded-l-xl border border-r-0 border-[#C7D3C0] bg-[#C7D3C0]/55 px-3 text-sm font-semibold text-[#52614F]">+91</span>
                  <input className={`${inputClass(errors.phoneNo)} rounded-l-none`} type="tel" inputMode="numeric" maxLength={10} value={form.phoneNo} onChange={(event) => updateField("phoneNo", event.target.value.replace(/\D/g, ""))} placeholder="9876543210" autoComplete="tel" />
                </div>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Password" error={errors.password}>
                <div className="relative">
                  <input className={`${inputClass(errors.password)} pr-12`} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#71806D] hover:bg-[#C7D3C0]/45" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    <EyeIcon crossed={!showPassword} />
                  </button>
                </div>
              </Field>

              <Field label="Confirm password" error={errors.confirmPassword}>
                <input className={inputClass(errors.confirmPassword)} type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
              </Field>
            </div>

            {message && <Alert>{message}</Alert>}

            <button className="w-full rounded-xl bg-[#C8A96B] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#C8A96B]/25 transition hover:-translate-y-0.5 hover:bg-[#B8985D] focus:outline-none focus:ring-4 focus:ring-[#C8A96B]/30 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#71806D]">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-bold text-[#63765E] hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error: string | undefined; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#52614F]">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</p>;
}

