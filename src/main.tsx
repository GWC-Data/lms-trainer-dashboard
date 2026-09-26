import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import "./index.css";
import App from "./App";

// One-time cleanup: earlier builds stored the access/refresh token and user
// directly in localStorage. Auth state now lives in Redux (in-memory) with
// the refresh token solely in an httpOnly cookie, but nothing else ever
// deletes those old entries — remove them so a browser that logged in
// before this change doesn't keep showing stale, JS-readable tokens.
["teqcertify_token", "teqcertify_refresh_token", "teqcertify_user"].forEach((key) =>
  localStorage.removeItem(key)
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
