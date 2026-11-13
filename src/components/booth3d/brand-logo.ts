// Geometry of the official Aratta logo, measured from the company's own artwork
// (public/brand-v3/aratta-logo-official.png). Every 3D or drawn use of the
// logo in the booth is built from these numbers so it matches the artwork.
//
// Units: the logo's full width is 1. The origin is the centre of the whole
// logo (mark plus name band). x grows to the right, y grows upwards.

export type LogoRect = {
  kind: "dark" | "gold";
  /** Centre x and y, then width and height, all in logo widths. */
  x: number;
  y: number;
  w: number;
  h: number;
};

// Source artwork pixels: the logo spans x 147..1151 and y 165.5..1121.5.
const SRC_X0 = 147;
const SRC_Y0 = 165.5;
const SRC_W = 1004;
const SRC_H = 956;

const rect = (kind: LogoRect["kind"], x0: number, y0: number, x1: number, y1: number): LogoRect => ({
  kind,
  x: ((x0 + x1) / 2 - SRC_X0) / SRC_W - 0.5,
  y: SRC_H / (2 * SRC_W) - ((y0 + y1) / 2 - SRC_Y0) / SRC_W,
  w: (x1 - x0) / SRC_W,
  h: (y1 - y0) / SRC_W,
});

/** Height of the whole logo in logo widths (about 0.952). */
export const LOGO_HEIGHT = SRC_H / SRC_W;

/** The flat colours of the artwork. `ground` is the black field the logo sits on. */
export const LOGO_COLORS = { gold: "#d1a84e", dark: "#241e20", ground: "#000000", text: "#ffffff" } as const;

/** The seven solid shapes of the mark, without the lettering. */
export const LOGO_RECTS: LogoRect[] = [
  // Dark block on the left: a top bar and a column (together an upside-down L).
  rect("dark", 147.5, 165.5, 537.5, 357.5),
  rect("dark", 147.5, 357.5, 338.5, 946.5),
  // Two gold squares.
  rect("gold", 367.5, 378.5, 535.5, 547.5),
  rect("gold", 367.5, 568.5, 535.5, 736.5),
  // Gold L: the upright and the base.
  rect("gold", 743.5, 165.5, 933.5, 946.5),
  rect("gold", 367.5, 755.5, 743.5, 946.5),
  // Dark bar on the right.
  rect("dark", 959.5, 165.5, 1150.5, 946.5),
];

/** The gold band under the mark that carries the company name. */
export const LOGO_BAND: LogoRect = rect("gold", 147.5, 969.5, 1150.5, 1121.5);

/**
 * Lettering, as white-on-transparent masks to tint and place on a plane of
 * exactly this size and position.
 * - wordmark: "ARATTA" reading top to bottom, in the dark colour.
 * - bandText: the Persian company name, in white, on the gold band.
 */
export const LOGO_LETTERING = {
  wordmark: { src: "/brand-v3/logo-wordmark-vertical-mask.png", ...rect("dark", 560, 160, 710, 745) },
  bandText: { src: "/brand-v3/logo-band-text-mask.png", ...rect("gold", 147, 970, 1151, 1122) },
} as const;

/** Ready-made flat artwork for textures and the page itself. */
export const LOGO_ARTWORK = {
  /** Square, on the black field, as the company supplied it. */
  onBlack: "/brand-v3/aratta-logo-official.png",
  /** Square, transparent field. */
  transparent: "/brand-v3/aratta-logo-official-transparent.png",
  /** Cropped to the logo's own bounds (aspect 1004 x 957), transparent field. */
  tight: "/brand-v3/aratta-logo-official-tight.png",
} as const;
