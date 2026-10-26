import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../src/constants";
import { LeafIcon } from "./icon";

type LocationState = {
  email?: string;
};

const sendOtpRequest = async (targetEmail: string) => {
  const response = await apiFetch("/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email: targetEmail }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status === 400 || result.success === false) {
    throw new Error(result.message || result.error || "Failed to send OTP.");
  }

  return result;
};

const verifyOtpRequest = async ({ email, otp }: { email: string; otp: string }) => {
  const response = await apiFetch("/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status === 400 || result.success === false) {
    throw new Error(result.message || result.error || "Invalid OTP.");
  }

  return result;
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedEmail = (location.state as LocationState | null)?.email ?? "";

  const [email, setEmail] = useState(passedEmail);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");

  const sendOtpMutation = useMutation({
    mutationFn: sendOtpRequest,
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Failed to send OTP.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtpRequest,
    onSuccess: () => {
      navigate("/login");
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "OTP verification failed.");
    },
  });

  useEffect(() => {
    if (!passedEmail) return;
    sendOtpMutation.mutate(passedEmail);
  }, [passedEmail, sendOtpMutation]);

  const handleResend = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setMessage("");
    setEmailError("");
    sendOtpMutation.mutate(email.trim());
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (!otp.trim()) {
      setOtpError("Enter the OTP sent to your email.");
      return;
    }

    setMessage("");
    verifyOtpMutation.mutate({ email: trimmedEmail, otp });
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#F7F4ED]/80">Almost there</p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Verify your email to finish signing up.</h1>
            <p className="mt-5 max-w-sm leading-7 text-[#F7F4ED]/85">We sent a one-time code to your inbox. You can also do this later.</p>
          </div>

          <p className="relative text-sm text-[#F7F4ED]/70">Simple • Secure • Easy to use</p>
        </aside>

        <div className="p-6 sm:p-10 lg:p-14">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C7D3C0] text-[#4F624B] md:hidden">
              <LeafIcon />
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Verify email</h2>
            <p className="mt-2 text-sm text-[#71806D]">Enter the OTP sent to your email address.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Email address" error={emailError}>
              <input
                className={inputClass(emailError)}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                  setMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <Field label="OTP" error={otpError}>
              <input
                className={inputClass(otpError)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, ""));
                  setOtpError("");
                  setMessage("");
                }}
                placeholder="Enter OTP"
                autoComplete="one-time-code"
              />
            </Field>

            {message && <Alert>{message}</Alert>}

            <button className="w-full rounded-xl bg-[#C8A96B] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#C8A96B]/25 transition hover:-translate-y-0.5 hover:bg-[#B8985D] focus:outline-none focus:ring-4 focus:ring-[#C8A96B]/30 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={verifyOtpMutation.isPending || !otp.trim()}>
              {verifyOtpMutation.isPending ? "Verifying..." : "Verify email"}
            </button>

            <button className="w-full rounded-xl border border-[#C7D3C0] px-5 py-3.5 font-semibold text-[#52614F] transition hover:bg-[#F7F4ED] disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleResend} disabled={sendOtpMutation.isPending}>
              {sendOtpMutation.isPending ? "Sending OTP..." : "Resend OTP"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#71806D]">
            Want to do this later?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-bold text-[#63765E] hover:underline">
              Skip to sign in
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

