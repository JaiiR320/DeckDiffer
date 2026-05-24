export type CardLayout = {
  badgeFontSize: number;
  badgePaddingX: number;
  badgePaddingY: number;
  controlIconSize: number;
  controlRight: number;
  controlSize: number;
  controlTop: number;
  stackHoverGap: number;
  stackPeek: number;
  stackTopInset: number;
};

const CARD_LAYOUT_RATIOS = {
  badgeFontSize: 0.0675,
  badgePaddingX: 0.0375,
  badgePaddingY: 0.009,
  controlIconSize: 0.055,
  controlRight: 0.035,
  controlSize: 0.13,
  controlTop: 0.32,
  stackHoverGap: 0.025,
  stackPeek: 0.115,
  stackTopInset: 0.025,
} as const;

export function computeCardLayout({
  height,
  width,
}: {
  height: number;
  width: number;
}): CardLayout {
  return {
    badgeFontSize: width * CARD_LAYOUT_RATIOS.badgeFontSize,
    badgePaddingX: width * CARD_LAYOUT_RATIOS.badgePaddingX,
    badgePaddingY: height * CARD_LAYOUT_RATIOS.badgePaddingY,
    controlIconSize: width * CARD_LAYOUT_RATIOS.controlIconSize,
    controlRight: width * CARD_LAYOUT_RATIOS.controlRight,
    controlSize: width * CARD_LAYOUT_RATIOS.controlSize,
    controlTop: height * CARD_LAYOUT_RATIOS.controlTop,
    stackHoverGap: height * CARD_LAYOUT_RATIOS.stackHoverGap,
    stackPeek: height * CARD_LAYOUT_RATIOS.stackPeek,
    stackTopInset: height * CARD_LAYOUT_RATIOS.stackTopInset,
  };
}

export function cardLayoutToCssVars(layout: CardLayout) {
  return {
    "--card-badge-font-size": `${layout.badgeFontSize}px`,
    "--card-badge-padding-x": `${layout.badgePaddingX}px`,
    "--card-badge-padding-y": `${layout.badgePaddingY}px`,
    "--card-control-icon-size": `${layout.controlIconSize}px`,
    "--card-control-right": `${layout.controlRight}px`,
    "--card-control-size": `${layout.controlSize}px`,
    "--card-control-top": `${layout.controlTop}px`,
    "--stack-card-hover-gap": `${layout.stackHoverGap}px`,
    "--stack-card-peek": `${layout.stackPeek}px`,
    "--stack-card-top-inset": `${layout.stackTopInset}px`,
  };
}
