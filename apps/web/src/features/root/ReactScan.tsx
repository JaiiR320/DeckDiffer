import { useEffect } from "react";

let isReactScanStarted = false;

export function ReactScan() {
  useEffect(() => {
    if (!import.meta.env.DEV || isReactScanStarted) {
      return;
    }

    isReactScanStarted = true;
    void import("react-scan").then(({ scan }) => {
      scan({
        enabled: true,
        showToolbar: true,
        showFPS: true,
        animationSpeed: "fast",
      });
    });
  }, []);

  return null;
}
