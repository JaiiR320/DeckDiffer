import { useLocation } from "@tanstack/react-router";
import { FeedbackButton } from "#/components/FeedbackButton";

export function FeedbackGate() {
  const location = useLocation();

  if (location.pathname === "/auth") {
    return null;
  }

  return <FeedbackButton />;
}
