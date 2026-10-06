/**
 * Brand constants, safe to import from server and client components alike.
 * (Header.tsx is a client module: importing values from it into a server
 * component gives you a client reference, not the value.)
 */

/** Official logo asset: 1665 x 546 px (ratio 3.05), trimmed, transparent. */
export const LOGO = { w: 1665, h: 546 } as const;

/** Logo files in /public. Dark ink artwork for light grounds, light for dark fields. */
export const LOGO_SRC = {
  dark: "/brand/tamada-media-logo-dark.png",
  light: "/brand/tamada-media-logo-light.png",
} as const;

export const BRAND_NAME = "Tamada Media";
