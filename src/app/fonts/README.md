Self-hosted web fonts (latin subset, variable weight), loaded with next/font/local in
src/app/layout.tsx. Fetching from Google at build time broke Vercel builds under Turbopack
("next/font/google queries have exactly one entry") whenever Google served /l/font?kit=…
URLs. Space Grotesk, Geist and JetBrains Mono are SIL Open Font License 1.1.
