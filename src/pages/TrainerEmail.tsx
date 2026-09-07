import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import {
  Mail,
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
import { trainerEmailApi, verifySetupTokenApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { AxiosError } from "axios";
import "./login-animations.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: BookOpen, tone: "bg-[#FBECE7] text-[#DE896A]", title: "Manage Courses", subtitle: "Create & update content" },
  { icon: Users, tone: "bg-[#EEEAFB] text-[#7C6FE0]", title: "Track Progress", subtitle: "Monitor learner growth" },
  { icon: TrendingUp, tone: "bg-[#E6F7EE] text-[#2FAE6B]", title: "Make an Impact", subtitle: "Build skilled professionals" },
] as const;

export default function TrainerEmail() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Once email is submitted or verified, browser back cannot return to Trainer Email
  if (!isSuccess && sessionStorage.getItem("trainerEmailCompleted") === "true") {
    return <Navigate to="/login" replace />;
  }

  const emailError = !email.trim()
    ? "Trainer email is required."
    : !EMAIL_PATTERN.test(email.trim())
    ? "Enter a valid email address."
    : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (emailError) return;

    setIsSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (token) {
        // Verify email + real invitation token with backend
        const res = await verifySetupTokenApi(token, cleanEmail);
        if (res.success) {
          sessionStorage.setItem("trainerEmailCompleted", "true");
          navigate(`/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`, { replace: true });
        } else {
          setSubmitError(res.message || "Invalid or expired invite link.");
        }
      } else {
        const res = await trainerEmailApi(cleanEmail);
        if (res.success) {
          sessionStorage.setItem("trainerEmailCompleted", "true");
          setIsSuccess(true);
        } else {
          setSubmitError(res.message || "Failed to process request.");
        }
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data) {
        const msg = (err.response.data as { message?: string }).message;
        setSubmitError(msg || "No trainer account found with this email address.");
      } else {
        setSubmitError("Network connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Right — card form */}
      <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-10 lg:bg-transparent">
        <div className="login-anim-fade-up flex w-full max-w-md items-center justify-center lg:justify-end">
          <img src={logo} alt="TeqCertify" className="h-8 w-auto object-contain" />
        </div>

        <div
          className="login-anim-fade-up w-full max-w-md rounded-2xl border border-[#F0EAE6] bg-white p-8 shadow-lg shadow-[#DE896A]/5"
          style={{ animationDelay: "120ms" }}
        >
          {isSuccess ? (
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6F7EE] text-[#2FAE6B]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-[#3A2A22]">Activation Link Sent</h1>
              <p className="mt-2 text-sm text-[#8C7A70]">
                An invitation email has been sent to <span className="font-semibold text-[#3A2A22]">{email}</span>. Please open your inbox and click the setup link to create your password.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  replace
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-[#DE896A] text-sm font-semibold text-white shadow-sm shadow-[#DE896A]/30 transition-colors hover:bg-[#C97255]"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#3A2A22]">Trainer Email</h1>
              <p className="mt-1 text-sm text-[#8C7A70]">Enter your trainer email to continue.</p>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="trainerEmail" className="text-xs font-medium text-[#6B5A52]">
                    Trainer Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
                    <input
                      id="trainerEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSubmitError(null);
                      }}
                      onBlur={() => setTouched(true)}
                      placeholder="you@teqcertify.com"
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] transition-colors focus:outline-none focus:ring-2",
                        touched && emailError
                          ? "border-red-300 focus:ring-red-200"
                          : "border-[#F0DED4] focus:border-[#DE896A] focus:ring-[#DE896A]/20"
                      )}
                    />
                  </div>
                  {touched && emailError && (
                    <p className="mt-1 text-xs text-red-500">{emailError}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} className="group mt-2 w-full justify-center">
                  {isSubmitting ? (
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

              <div className="mt-6 text-center">
                <Link to="/login" replace className="text-xs text-[#8C7A70] hover:text-[#DE896A]">
                  Already have a password? Back to Login
                </Link>
              </div>
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
