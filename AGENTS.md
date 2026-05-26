<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aratta Expo Cinematic Project Guidance

This is a standalone Next.js App Router project for the authorized Aratta Expo cinematic redesign. Do not move this work into the parent KillDraft/comedyforge checkout.

## Stack
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- GSAP ScrollTrigger owns scroll-linked hero construction.
- Framer Motion is for contained micro-interactions only.
- lucide-react is the icon source.

## Product Rules
- Persian is primary and RTL; English must remain content-parity LTR.
- Current public event dates are stale relative to May 26, 2026. Keep them archived unless fresh dates are provided.
- Registration is inquiry/download driven. Do not claim automated signup, payment, booth allocation, or backend submission unless a real backend is added.
- Keep official PDF/download links visible and verify they resolve when changing them.
- Do not expose secrets or add client-side pretend integrations.

## Checks
- Run `npm run lint`, `npm test`, and `npm run build` after meaningful code changes.
- For UI work, also run the app and inspect desktop and mobile layouts.
