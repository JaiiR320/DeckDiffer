import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

if (import.meta.env.DEV) {
  void import("react-scan").then(({ scan }) => {
    scan({ showFPS: true });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
