// Staff pictures: one of the built-in illustrations ("preset:<n>"), or an uploaded photo.
// The database (set_my_avatar) accepts the same values.

/** How many built-in pictures there are. Keep equal to AVATAR_PRESETS in components/portal/people.tsx. */
export const AVATAR_COUNT = 16;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Which built-in picture a person shows: their choice, else one picked from their id so it never changes. */
export function avatarPreset(staff: { id: string; avatar_url: string | null }) {
  const m = /^preset:(\d{1,2})$/.exec(staff.avatar_url ?? "");
  if (m && Number(m[1]) < AVATAR_COUNT) return Number(m[1]);
  return hash(staff.id) % AVATAR_COUNT;
}

/** A photo we can show directly. Storage paths need a signed link first, so they fall back to the illustration. */
export function avatarPhoto(avatarUrl: string | null | undefined) {
  return avatarUrl && /^https:\/\//.test(avatarUrl) ? avatarUrl : null;
}
