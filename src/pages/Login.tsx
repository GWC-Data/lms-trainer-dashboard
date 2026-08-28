import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Users,
  TrendingUp,
} from "lucide-react";
import { useAuth, DEMO_CREDENTIALS } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import trainerImg from "@/assets/trainer.png";
import "./login-animations.css";

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

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  const errors = validate(email, password);
  const hasErrors = Object.keys(errors).length > 0;

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

    const redirectTo = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
    navigate(redirectTo, { replace: true });
  }

  function fillDemoCredentials() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setTouched({});
    setSubmitError(null);
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
          <h1 className="text-2xl font-bold text-[#3A2A22]">Trainer Login</h1>
          <p className="mt-1 text-sm text-[#8C7A70]">Sign in to manage your assigned courses.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {submitError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {submitError}
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
              <label htmlFor="password" className="text-xs font-medium text-[#6B5A52]">
                Password
              </label>
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
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#F0DED4]" />
            <span className="text-xs text-[#C7B6AC]">or</span>
            <div className="h-px flex-1 bg-[#F0DED4]" />
          </div>

          <button
            type="button"
            onClick={fillDemoCredentials}
            className="login-anim-pulse-ring flex w-full items-center gap-2 rounded-xl border border-dashed border-[#EEAF9C] bg-[#FFFBF9] px-3 py-2.5 text-left text-xs text-[#8C7A70] hover:bg-[#FBECE7]"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#DE896A]" />
            <span>
              Demo credentials — <span className="font-medium text-[#3A2A22]">{DEMO_CREDENTIALS.email}</span> ·{" "}
              <span className="font-medium text-[#3A2A22]">{DEMO_CREDENTIALS.password}</span>{" "}
              <span className="text-[#DE896A]">(tap to fill)</span>
            </span>
          </button>
        </div>

        <p className="login-anim-fade text-xs text-[#C7B6AC]" style={{ animationDelay: "300ms" }}>
          &copy; {new Date().getFullYear()} TeqCertify. All rights reserved.
        </p>
      </div>
    </div>
  );
}
