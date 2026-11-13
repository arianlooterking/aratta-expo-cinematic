/**
 * Server-safe pieces of the theme store (no React), so the document shell can
 * inline the no-flash script. The store and hook live in ./theme.ts.
 */
export const THEME_STORAGE_KEY = "aratta-theme";
export const THEME_EVENT = "aratta-theme";
export const DEFAULT_THEME: "dark" | "light" = "dark";

/** Staff, sign-in and admin routes, with or without a language prefix. */
export const THEME_EXCLUDED_PATH = /^\/(?:(?:fa|en)\/)?(?:staff|admin)(?:\/|$)/;

/**
 * Runs at the top of <body> while the HTML is parsed, before first paint, so a stored
 * light theme never flashes dark. Same markup from the server for both themes.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;if(${THEME_EXCLUDED_PATH.toString()}.test(location.pathname))return;var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}d.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})();`;
