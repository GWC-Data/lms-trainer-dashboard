import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AxiosError } from "axios";
import {
  loginApi,
  verifyOtpApi,
  resendOtpApi,
  logoutApi,
  restoreSessionApi,
  type BackendUser,
  type SessionRestoreResult,
} from "@/services/api";

export interface AuthState {
  user: BackendUser | null;
  accessToken: string | null;
  isLoading: boolean;
  // True until the initial cookie-based session restore (on app load) has
  // resolved. Route guards must wait for this instead of treating "no token
  // yet" as "logged out" — the access token only ever lives in memory now.
  isBootstrapping: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  isBootstrapping: true,
};

// The backend already returns a user-facing `message` for every login/OTP
// failure branch (invalid creds, account not activated, rate-limited,
// invalid/expired/max-attempts OTP, device limit, resend cooldown, ...) —
// so this just surfaces that message, with a network/fallback case.
function mapAuthError(err: unknown, fallbackMessage: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (err.code === "ERR_NETWORK") {
      return "Unable to connect to LMS backend server. Please check your connection.";
    }
  }
  return fallbackMessage;
}

function assertTrainerRole(user: BackendUser): string | null {
  if (user.role?.toUpperCase() !== "TRAINER") {
    return "Access denied. Only trainer accounts can access this dashboard.";
  }
  return null;
}

export type LoginThunkResult =
  | { requiresOtp: true; verificationId: string }
  | { requiresOtp: false; user: BackendUser; accessToken: string };

export const loginThunk = createAsyncThunk<
  LoginThunkResult,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await loginApi(email, password);
    // Two response shapes share this endpoint: a fresh device gets
    // { requiresOtp: true, verificationId }; a device already OTP-verified
    // today gets tokens back immediately, either nested under `login` or
    // flat on the response — check for tokens first rather than trusting
    // `requiresOtp` as a strict discriminant (it's optional on both shapes).
    const raw = response as any;
    const authPayload = raw.login ?? raw;
    if (authPayload.accessToken && authPayload.user) {
      const roleError = assertTrainerRole(authPayload.user);
      if (roleError) return rejectWithValue(roleError);
      return { requiresOtp: false, user: authPayload.user, accessToken: authPayload.accessToken };
    }

    if (raw.verificationId) {
      return { requiresOtp: true, verificationId: raw.verificationId };
    }

    return rejectWithValue("Invalid response from server.");
  } catch (err) {
    return rejectWithValue(mapAuthError(err, "Invalid email or username or password."));
  }
});

export const verifyOtpThunk = createAsyncThunk<
  { user: BackendUser; accessToken: string },
  { verificationId: string; otp: string },
  { rejectValue: string }
>("auth/verifyOtp", async ({ verificationId, otp }, { rejectWithValue }) => {
  try {
    const response = await verifyOtpApi(verificationId, otp);
    if (!response.accessToken || !response.user) {
      return rejectWithValue("Invalid response from server.");
    }
    const roleError = assertTrainerRole(response.user);
    if (roleError) return rejectWithValue(roleError);

    return { user: response.user, accessToken: response.accessToken };
  } catch (err) {
    return rejectWithValue(mapAuthError(err, "Invalid OTP. Please try again."));
  }
});

export const resendOtpThunk = createAsyncThunk<{ message?: string }, string, { rejectValue: string }>(
  "auth/resendOtp",
  async (verificationId, { rejectWithValue }) => {
    try {
      const response = await resendOtpApi(verificationId);
      return { message: response.message };
    } catch (err) {
      return rejectWithValue(mapAuthError(err, "Could not resend OTP. Please try again."));
    }
  }
);

// Silently restores the session from the httpOnly refresh-token cookie the
// browser attaches automatically. Used both once on app load (page
// reload/reopen — there is no client-readable token to start from anymore),
// proactively shortly before the access token expires, and from the axios
// response interceptor after a 401 — so there is exactly one place that
// knows how to turn "a valid refresh cookie" into a fresh access token +
// user, and one shared understanding of "invalid" vs. "couldn't tell".
export const restoreSessionThunk = createAsyncThunk<SessionRestoreResult>(
  "auth/restoreSession",
  async () => restoreSessionApi()
);

export const logoutThunk = createAsyncThunk<void>("auth/logout", async () => {
  try {
    await logoutApi();
  } catch {
    // Best-effort: a failed logout call must never trap the user in a
    // logged-in-looking state client-side — state is cleared regardless.
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!action.payload.requiresOtp) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        }
      })
      .addCase(loginThunk.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(verifyOtpThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(verifyOtpThunk.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isBootstrapping = false;
        if (action.payload.status === "authenticated") {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        } else if (action.payload.status === "unauthenticated") {
          state.user = null;
          state.accessToken = null;
        }
        // "unknown" (transient failure — network blip, 5xx, timeout):
        // deliberately leave user/accessToken untouched. The existing
        // access token is still valid until it actually expires, and the
        // response interceptor's reactive refresh-on-401 is the real safety
        // net once it does — punishing a network hiccup with a hard logout
        // is exactly the bug this distinction exists to avoid.
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        // The thunk itself never throws (restoreSessionApi always resolves
        // one of the three statuses) — this only fires on thunk
        // cancellation, which isn't evidence of anything about the session.
        state.isBootstrapping = false;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
      });
  },
});

export default authSlice.reducer;
