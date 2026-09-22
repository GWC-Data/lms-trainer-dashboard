import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Users,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import trainerImg from "@/assets/trainer.png";
import "./login-animations.css";

const OTP_RESEND_COOLDOWN_SECONDS = 45;

// Displays only the first character of the local part, e.g. "c***@gmail.com" —
// computed purely client-side from the email the user already typed in, so
// the backend never needs to compute or return a masked value.
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

const FEATURES = [
  { icon: BookOpen, tone: "bg-[#FBECE7] text-[#DE896A]", title: "Manage Courses", subtitle: "Create & update content" },
  { icon: Users, tone: "bg-[#EEEAFB] text-[#7C6FE0]", title: "Track Progress", subtitle: "Monitor learner growth" },
  { icon: TrendingUp, tone: "bg-[#E6F7EE] text-[#2FAE6B]", title: "Make an Impact", subtitle: "Build skilled professionals" },
] as const;

type LoginStep = "credentials" | "otp";

export default function Login() {
  const { isAuthenticated, login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(
    (location.state as { email?: string })?.email ?? ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(
    (location.state as { error?: string })?.error ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<LoginStep>("credentials");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds > 0]);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  const errors = validate(email, password);
  const hasErrors = Object.keys(errors).length > 0;

  function completeLoginAndRedirect() {
    // Clean up any temporary auth session flags
    sessionStorage.removeItem("forgotPasswordSubmitted");
    sessionStorage.removeItem("passwordResetCompleted");
    sessionStorage.removeItem("completedResetToken");
    sessionStorage.removeItem("trainerEmailCompleted");
    sessionStorage.removeItem("setPasswordCompleted");
    sessionStorage.removeItem("completedInviteToken");

    const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError(null);

    if (hasErrors) return;

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    if (!result.requiresOtp) {
      // Already verified OTP today on this device — tokens already stored
      // by login(), skip the OTP screen.
      completeLoginAndRedirect();
      return;
    }

    setVerificationId(result.verificationId ?? null);
    setStep("otp");
    setCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
    setOtpDigits(Array(6).fill(""));
    setOtpError(null);
    setResendInfo(null);
  }

  function handleOtpDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setOtpError(null);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    setOtpDigits(Array.from({ length: 6 }, (_, i) => pasted[i] || ""));
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!verificationId) return;

    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setOtpError(null);
    const result = await verifyOtp(verificationId, otp);
    setIsVerifying(false);

    if (!result.success) {
      setOtpError(result.error ?? "Invalid OTP. Please try again.");
      return;
    }

    completeLoginAndRedirect();
  }

  async function handleResendOtp() {
    if (!verificationId || cooldownSeconds > 0 || isResending) return;

    setIsResending(true);
    setOtpError(null);
    setResendInfo(null);
    const result = await resendOtp(verificationId);
    setIsResending(false);

    if (!result.success) {
      setOtpError(result.error ?? "Could not resend OTP. Please try again.");
      return;
    }

    setResendInfo(result.message ?? "A new OTP has been sent to your registered email.");
    setCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
    setOtpDigits(Array(6).fill(""));
    otpInputRefs.current[0]?.focus();
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setVerificationId(null);
    setOtpError(null);
    setResendInfo(null);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#FDF9F7] lg:grid-cols-[1.15fr_1fr] lg:h-screen lg:overflow-hidden">
      {/* Left — branding panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-16 lg:pt-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#F5D1C4] opacity-50 blur-3xl" />
        <div className="login-anim-float-sm pointer-events-none absolute right-10 top-24 h-40 w-40 rounded-full bg-[#EEEAFB] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#E6F7EE] opacity-50 blur-3xl" />

        <div className="relative z-10 max-w-xl shrink-0">
          <p
            className="login-anim-fade-up text-xs font-bold uppercase tracking-[0.25em] text-[#DE896A]"
            style={{ animationDelay: "60ms" }}
          >
            Teach <span className="mx-1.5 text-[#EEAF9C]">&bull;</span> Guide{" "}
            <span className="mx-1.5 text-[#EEAF9C]">&bull;</span> Empower
          </p>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#1F2A44] xl:text-[2.75rem]">
            <span className="login-anim-fade-up block" style={{ animationDelay: "160ms" }}>
              Shape Future Skills,
            </span>
            <span className="login-anim-fade-up block text-[#DE896A]" style={{ animationDelay: "260ms" }}>
              One Course at a Time.
            </span>
          </h1>

          <p
            className="login-anim-fade-up mt-4 max-w-md text-[15px] text-[#8C7A70]"
            style={{ animationDelay: "360ms" }}
          >
            Log in to manage your courses, track learner progress and make a greater impact.
          </p>

          <div className="mt-8 space-y-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="login-anim-pop flex max-w-[270px] items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm shadow-black/[0.03] backdrop-blur-sm"
                style={{ animationDelay: `${460 + i * 130}ms` }}
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", f.tone)}>
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#233047]">{f.title}</p>
                  <p className="text-xs text-[#8C7A70]">{f.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 z-0 flex h-[90%] w-[80%] items-end justify-end lg:pr-8">
          <img
            src={trainerImg}
            alt=""
            className="max-h-full w-auto max-w-[100%] object-contain object-bottom xl:max-w-[95%] 2xl:max-w-[90%]"
          />
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-10 lg:bg-transparent">
        <div className="login-anim-fade-up flex w-full max-w-md items-center justify-center lg:justify-end">
          <img src={logo} alt="TeqCertify" className="h-8 w-auto object-contain" />
        </div>

        <div
          className="login-anim-fade-up w-full max-w-md rounded-2xl border border-[#F0EAE6] bg-white p-8 shadow-lg shadow-[#DE896A]/5"
          style={{ animationDelay: "120ms" }}
        >
          {step === "credentials" ? (
            <>
              <h1 className="text-2xl font-bold text-[#3A2A22]">Trainer Login</h1>
              <p className="mt-1 text-sm text-[#8C7A70]">Sign in to manage your assigned courses.</p>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="text-xs font-medium text-[#6B5A52]">
                    Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSubmitError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder="you@teqcertify.com"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        touched.email && errors.email
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-medium text-[#6B5A52]">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      replace
                      onClick={() => {
                        sessionStorage.removeItem("forgotPasswordSubmitted");
                        sessionStorage.removeItem("passwordResetCompleted");
                        sessionStorage.removeItem("completedResetToken");
                      }}
                      className="text-xs font-medium text-[#DE896A] hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setSubmitError(null);
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-10 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        touched.password && errors.password
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C7B6AC] hover:text-[#8C7A70]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} className="group mt-2 w-full justify-center">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <p className="text-xs text-[#8C7A70]">
                    First time logging in?{" "}
                    <Link
                      to="/trainer-email"
                      replace
                      onClick={() => {
                        sessionStorage.removeItem("trainerEmailCompleted");
                        sessionStorage.removeItem("setPasswordCompleted");
                        sessionStorage.removeItem("completedInviteToken");
                      }}
                      className="font-semibold text-[#DE896A] hover:underline"
                    >
                      Activate account
                    </Link>
                  </p>
                </div>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBackToCredentials}
                className="mb-3 flex items-center gap-1 text-xs font-medium text-[#8C7A70] hover:text-[#DE896A]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#DE896A]" />
                <h1 className="text-2xl font-bold text-[#3A2A22]">Verify Your Account</h1>
              </div>
              <p className="mt-1 text-sm text-[#8C7A70]">
                We've sent a 6-digit OTP to your registered email
                {email ? ` (${maskEmail(email)})` : ""}.
              </p>

              <form onSubmit={handleVerifyOtp} noValidate className="mt-6 space-y-4">
                {otpError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}
                {resendInfo && !otpError && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    {resendInfo}
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="h-12 w-11 rounded-xl border border-[#F0DED4] bg-white text-center text-lg font-semibold text-[#3A2A22] transition-colors focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
                    />
                  ))}
                </div>

                <Button type="submit" disabled={isVerifying} className="group mt-2 w-full justify-center">
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center text-xs text-[#8C7A70]">
                  Didn't receive the OTP?{" "}
                  {cooldownSeconds > 0 ? (
                    <span className="font-medium text-[#C7B6AC]">Resend in {cooldownSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="font-semibold text-[#DE896A] hover:underline disabled:opacity-50"
                    >
                      {isResending ? "Resending..." : "Resend OTP"}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        <p className="login-anim-fade text-xs text-[#C7B6AC]" style={{ animationDelay: "300ms" }}>
          &copy; {new Date().getFullYear()} TeqCertify. All rights reserved.
        </p>
      </div>
    </div>
  );
}
