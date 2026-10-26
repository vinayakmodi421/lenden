import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../src/constants";
import { EyeIcon, LeafIcon } from "./icon";

type LoginForm = {
  identifier: string;
  password: string;
};

type FormErrors = Partial<Record<keyof LoginForm, string>>;

const initialForm: LoginForm = {
  identifier: "",
  password: "",
};

const loginUser = async (data: LoginForm) => {
  const identifier = data.identifier.trim();
  const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
  const body = isEmail ? { email: identifier, password: data.password } : { username: identifier, password: data.password };

  const response = await apiFetch("/user-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  const apiMessage = result.message || result.error || "Login failed. Please try again.";
  const failed = !response.ok || result.status === 400 || result.status === 401 || result.success === false;

  if (failed) {
    throw new Error(apiMessage);
  }

  return result;
};

export default function Login() {
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (result) => {
      localStorage.setItem("user", JSON.stringify(result.user));
      navigate("/");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Login failed. Please try again.");
    },
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/");
    }
  }, [navigate]);

  const updateField = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const identifier = form.identifier.trim();

    if (!identifier) {
      nextErrors.identifier = "Enter your username or email.";
    } else {
      const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
      const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(identifier);
      if (!isEmail && !isUsername) {
        nextErrors.identifier = "Enter a valid username or email address.";
      }
    }

    if (!form.password) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setMessage("");
    await loginMutation.mutateAsync(form).catch(() => undefined);
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#F7F4ED]/80">Welcome back</p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Sign in to continue.</h1>
            <p className="mt-5 max-w-sm leading-7 text-[#F7F4ED]/85">Use your username or email and password to access your account.</p>
          </div>

          <p className="relative text-sm text-[#F7F4ED]/70">Simple • Secure • Easy to use</p>
        </aside>

        <div className="p-6 sm:p-10 lg:p-14">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C7D3C0] text-[#4F624B] md:hidden">
              <LeafIcon />
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm text-[#71806D]">Enter your details to log in.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Username or email" error={errors.identifier}>
              <input className={inputClass(errors.identifier)} type="text" value={form.identifier} onChange={(event) => updateField("identifier", event.target.value)} placeholder="username or you@example.com" autoComplete="username" />
            </Field>

            <Field label="Password" error={errors.password}>
              <div className="relative">
                <input className={`${inputClass(errors.password)} pr-12`} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Enter your password" autoComplete="current-password" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#71806D] hover:bg-[#C7D3C0]/45" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  <EyeIcon crossed={!showPassword} />
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <button type="button" onClick={() => navigate("/forget-password")} className="text-sm font-semibold text-[#63765E] hover:underline">
                Forgot password?
              </button>
            </div>

            {message && <Alert>{message}</Alert>}

            <button className="w-full rounded-xl bg-[#C8A96B] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#C8A96B]/25 transition hover:-translate-y-0.5 hover:bg-[#B8985D] focus:outline-none focus:ring-4 focus:ring-[#C8A96B]/30 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#71806D]">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => navigate("/register")} className="font-bold text-[#63765E] hover:underline">
              Create account
            </button>
          </p>
          <p className="mt-3 text-center text-sm text-[#71806D]">
            Need to verify your email?{" "}
            <button type="button" onClick={() => navigate("/verify-email")} className="font-bold text-[#63765E] hover:underline">
              Verify now
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

