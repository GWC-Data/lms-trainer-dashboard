import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useNavigate, Link, Navigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BookOpen,
  Users,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import trainerImg from "@/assets/trainer.png";
import { verifySetupTokenApi, setPasswordApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import "./login-animations.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: BookOpen, tone: "bg-[#FBECE7] text-[#DE896A]", title: "Manage Courses", subtitle: "Create & update content" },
  { icon: Users, tone: "bg-[#EEEAFB] text-[#7C6FE0]", title: "Track Progress", subtitle: "Monitor learner growth" },
  { icon: TrendingUp, tone: "bg-[#E6F7EE] text-[#2FAE6B]", title: "Make an Impact", subtitle: "Build skilled professionals" },
] as const;

type Step = "email" | "password";

export default function SetPassword() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [step, setStep] = useState<Step>("email");
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Step 1: Email (if manually needed)
  const [email, setEmail] = useState(emailParam);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(emailParam);

  // Step 2: Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState<{ newPassword?: boolean; confirmPassword?: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Automatic token verification on mount
  useEffect(() => {
    if (!token) {
      setIsVerifyingToken(false);
      setTokenError("Invalid or expired invite link.");
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        const res = await verifySetupTokenApi(token, emailParam || undefined);
        if (!isMounted) return;
        if (res.success) {
          setVerifiedEmail(res.email || emailParam);
          setEmail(res.email || emailParam);
          setStep("password");
          setTokenError(null);
        } else {
          setTokenError(res.message || "Invalid or expired invite link.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof AxiosError && err.response?.data) {
          const msg = (err.response.data as { message?: string }).message;
          setTokenError(msg || "Invalid or expired invite link.");
        } else {
          setTokenError("Unable to verify invitation link. Please check your connection.");
        }
      } finally {
        if (isMounted) setIsVerifyingToken(false);
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, emailParam]);

  // Route guards (AFTER all hooks)
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Once account password has been set, browser back button cannot return to Set Password
  if (
    sessionStorage.getItem("setPasswordCompleted") === "true" ||
    (token && sessionStorage.getItem("completedInviteToken") === token)
  ) {
    return <Navigate to="/login" replace />;
  }

  // Fallback Step 1: Handle Email verification if needed
  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setEmailError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError("Trainer email is required.");
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    if (!token) {
      setTokenError("Invalid or expired invite link.");
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const res = await verifySetupTokenApi(token, cleanEmail);
      if (res.success) {
        setVerifiedEmail(res.email || cleanEmail);
        setStep("password");
      } else {
        setEmailError(res.message || "Invalid or expired invite link.");
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data) {
        const msg = (err.response.data as { message?: string }).message;
        setEmailError(msg || "The entered email does not match the invitation.");
      } else {
        setEmailError("Unable to verify invitation. Please check your connection.");
      }
    } finally {
      setIsVerifyingEmail(false);
    }
  }

  // Step 2: Password Validation
  function validatePasswords() {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = "New Password is required.";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters long.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm Password is required.";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  }

  const passwordErrors = validatePasswords();
  const hasPasswordErrors = Object.keys(passwordErrors).length > 0;

  // Step 2: Handle Password submit
  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordTouched({ newPassword: true, confirmPassword: true });
    setSubmitError(null);

    if (hasPasswordErrors) return;

    setIsSubmitting(true);
    try {
      const res = await setPasswordApi(token, newPassword, verifiedEmail);
      if (res.success) {
        setIsSuccess(true);
        sessionStorage.setItem("setPasswordCompleted", "true");
        if (token) {
          sessionStorage.setItem("completedInviteToken", token);
        }
        setTimeout(() => {
          navigate("/login", { state: { email: verifiedEmail }, replace: true });
        }, 1200);
      } else {
        setSubmitError(res.message || "Failed to set password. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data) {
        const msg = (err.response.data as { message?: string }).message;
        setSubmitError(msg || "Failed to set password. The link may have expired.");
      } else {
        setSubmitError("Network error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#FDF9F7] lg:grid-cols-[1.15fr_1fr] lg:h-screen lg:overflow-hidden">
      {/* Left — branding panel (identical to Login) */}
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
            Activate your account to manage courses, track learner progress and inspire future professionals.
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

      {/* Right — form container */}
      <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-10 lg:bg-transparent">
        <div className="login-anim-fade-up flex w-full max-w-md items-center justify-center lg:justify-end">
          <img src={logo} alt="TeqCertify" className="h-8 w-auto object-contain" />
        </div>

        <div
          className="login-anim-fade-up w-full max-w-md rounded-2xl border border-[#F0EAE6] bg-white p-8 shadow-lg shadow-[#DE896A]/5"
          style={{ animationDelay: "120ms" }}
        >
          {isVerifyingToken ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#DE896A]" />
              <p className="mt-4 text-sm text-[#8C7A70]">Verifying invitation link...</p>
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{tokenError}</span>
              </div>
              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  replace
                  className="text-sm font-semibold text-[#DE896A] hover:underline"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#3A2A22]">Password Created!</h2>
              <p className="text-sm text-[#8C7A70]">
                Your trainer account has been activated. Redirecting to login...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  replace
                  state={{ email: verifiedEmail }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#DE896A] hover:underline"
                >
                  Go to Login now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : step === "email" ? (
            /* STEP 1: TRAINER EMAIL PAGE */
            <>
              <h1 className="text-2xl font-bold text-[#3A2A22]">Trainer Email</h1>
              <p className="mt-1 text-sm text-[#8C7A70]">Enter your trainer email to continue.</p>

              <form onSubmit={handleEmailSubmit} noValidate className="mt-6 space-y-4">
                {emailError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="trainer-email" className="text-xs font-medium text-[#6B5A52]">
                    Trainer Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="trainer-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="you@teqcertify.com"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        emailTouched && emailError
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                  </div>
                  {emailTouched && emailError && (
                    <p className="mt-1 text-xs text-red-500">{emailError}</p>
                  )}
                </div>

                <Button type="submit" disabled={isVerifyingEmail} className="group mt-2 w-full justify-center">
                  {isVerifyingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* STEP 2: SET PASSWORD PAGE */
            <>
              <h1 className="text-2xl font-bold text-[#3A2A22]">Set Password</h1>
              <p className="mt-1 text-sm text-[#8C7A70]">Create your password to activate your trainer account.</p>

              <form onSubmit={handlePasswordSubmit} noValidate className="mt-6 space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="new-password" className="text-xs font-medium text-[#6B5A52]">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setSubmitError(null);
                      }}
                      onBlur={() => setPasswordTouched((t) => ({ ...t, newPassword: true }))}
                      placeholder="••••••••"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-10 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        passwordTouched.newPassword && passwordErrors.newPassword
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C7B6AC] hover:text-[#8C7A70]"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordTouched.newPassword && passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="text-xs font-medium text-[#6B5A52]">
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setSubmitError(null);
                      }}
                      onBlur={() => setPasswordTouched((t) => ({ ...t, confirmPassword: true }))}
                      placeholder="••••••••"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-10 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        passwordTouched.confirmPassword && passwordErrors.confirmPassword
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C7B6AC] hover:text-[#8C7A70]"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordTouched.confirmPassword && passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} className="group mt-2 w-full justify-center">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Activating...
                    </>
                  ) : (
                    <>
                      Set Password
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
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
