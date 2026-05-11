import { useEffect, useReducer, useRef } from "react";
import { getCardPreview, type CardPreviewLookup, type CardPreviewResult } from "../../lib/scryfall";

type PreviewStatus = "idle" | "loading" | "ready" | "error";

type PreviewState = {
  previewLookup: CardPreviewLookup | null;
  previewCard: CardPreviewResult | null;
  previewStatus: PreviewStatus;
  isPreviewPinned: boolean;
};

type PreviewAction =
  | { type: "request"; lookup: CardPreviewLookup }
  | { type: "loading" }
  | { type: "success"; preview: CardPreviewResult | null }
  | { type: "error" }
  | { type: "togglePinned" };

const initialPreviewState: PreviewState = {
  previewLookup: null,
  previewCard: null,
  previewStatus: "idle",
  isPreviewPinned: false,
};

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case "request":
      return { ...state, previewLookup: action.lookup };
    case "loading":
      return { ...state, previewCard: null, previewStatus: "loading" };
    case "success":
      return {
        ...state,
        previewCard: action.preview,
        previewStatus: action.preview ? "ready" : "error",
      };
    case "error":
      return { ...state, previewCard: null, previewStatus: "error" };
    case "togglePinned":
      return { ...state, isPreviewPinned: !state.isPreviewPinned };
  }
}

export function useDeckPreview() {
  const [state, dispatch] = useReducer(previewReducer, initialPreviewState);
  const previewRequestIdRef = useRef(0);

  useEffect(() => {
    if (!state.previewLookup) {
      return;
    }

    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    dispatch({ type: "loading" });

    getCardPreview(state.previewLookup)
      .then((nextPreview) => {
        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        dispatch({ type: "success", preview: nextPreview });
      })
      .catch(() => {
        if (previewRequestIdRef.current !== requestId) {
          return;
        }

        dispatch({ type: "error" });
      });
  }, [state.previewLookup]);

  function updatePreviewCard(nextPreview: CardPreviewLookup, source: "hover" | "manual" = "hover") {
    if (state.isPreviewPinned && source === "hover") {
      return;
    }

    if (
      state.previewLookup?.name === nextPreview.name &&
      state.previewLookup?.setCode === nextPreview.setCode &&
      state.previewLookup?.collectorNumber === nextPreview.collectorNumber
    ) {
      return;
    }

    dispatch({ type: "request", lookup: nextPreview });
  }

  return {
    previewLookup: state.previewLookup,
    previewCard: state.previewCard,
    previewStatus: state.previewStatus,
    isPreviewPinned: state.isPreviewPinned,
    updatePreviewCard,
    togglePreviewPinned: () => dispatch({ type: "togglePinned" }),
  };
}
