/*
 * Every brand image path in one place. All of them come from the owner's logo, square logo and banner (25 Oct 2026),
 * rebuilt by the team's brand script at these same paths, so a new logo needs no code edits.
 */
export const ASSETS = {
  /** Transparent mark (navbar, footer, token page). */
  mark: "/brand/mark.webp",
  /** Large faded mark behind the hero and the token page heading. */
  heroMark: "/brand/hero-mark.webp",
  /** Square mark on its dark plate (wallet avatar, token avatar). */
  markSquare: "/brand/mark-square.webp",
  /** The owner's wide banner (profile headers; not placed on a page). */
  banner: "/brand/banner.webp",
  /** Square PNG served by Next from src/app/icon.png (structured data needs a PNG logo). */
  logoPng: "/icon.png",
  /** Share card served from src/app/opengraph-image.jpg. */
  og: "/opengraph-image.jpg",
} as const;
