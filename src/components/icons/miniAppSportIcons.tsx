import type { ReactNode, SVGProps } from "react";

export type MiniAppSportIcon = typeof FlexibilityStretchIcon;

type IconProps = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };

const VIEW_BOX = 48;
const STROKE = 2.5;

function SportIconSvg({
  size = 44,
  strokeWidth = STROKE,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Standing quad stretch — mobility / flexibility. */
export function FlexibilityStretchIcon({ size = 44, strokeWidth = STROKE, ...props }: IconProps) {
  return (
    <SportIconSvg size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="22" cy="9" r="3.75" />
      <path d="M22 12.75V24" />
      <path d="M22 24L17 38" />
      <path d="M22 24L27.5 31L32 19.5" />
      <path d="M23.5 16L29 18.5" />
    </SportIconSvg>
  );
}

/** Deep squat — arms extended forward. */
export function SquatIcon({ size = 44, strokeWidth = STROKE, ...props }: IconProps) {
  return (
    <SportIconSvg size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="24" cy="9.5" r="4" />
      <path d="M24 13.5V21.5" />
      <path d="M15 19.5H33" />
      <path d="M24 21.5L16.5 29.5V38" />
      <path d="M24 21.5L31.5 29.5V38" />
    </SportIconSvg>
  );
}

/** Side-view straight-arm plank. */
export function PlankSideIcon({ size = 44, strokeWidth = STROKE, ...props }: IconProps) {
  return (
    <SportIconSvg size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="10.5" cy="24" r="4" />
      <path d="M14.5 24H40" />
      <path d="M17 24V33" />
      <path d="M40 24H44" />
    </SportIconSvg>
  );
}

/** Pull-up bar — two posts and horizontal bar, no figure. */
export function PullUpBarIcon({ size = 44, strokeWidth = STROKE, ...props }: IconProps) {
  return (
    <SportIconSvg size={size} strokeWidth={strokeWidth} {...props}>
      <path d="M14 13V38" />
      <path d="M34 13V38" />
      <path d="M11 13H37" />
    </SportIconSvg>
  );
}

/** Side-view bicycle — matches monoline sport family. */
export function CyclingBikeIcon({ size = 44, strokeWidth = STROKE, ...props }: IconProps) {
  return (
    <SportIconSvg size={size} strokeWidth={strokeWidth} {...props}>
      <circle cx="14" cy="31" r="7" />
      <circle cx="34" cy="31" r="7" />
      <path d="M14 31L22 19L30 17L34 31" />
      <path d="M22 19V13" />
      <path d="M30 17L33 13" />
    </SportIconSvg>
  );
}

/** @deprecated Use PlankSideIcon */
export const PlankAbsIcon = PlankSideIcon;

/** @deprecated Use SquatIcon */
export const SquatLegIcon = SquatIcon;

/** @deprecated Use PullUpBarIcon */
export const PullUpBicepIcon = PullUpBarIcon;
