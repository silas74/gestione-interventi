# Design System Specification — Field Service Management (Impeccable UI)

This design system enforces the 5 strict **Impeccable** rules across the entire application:

## 1. Spaziature: Multipli di 8, sempre le stesse
All layout margins, paddings, and gaps strictly follow an **8px spatial grid**:
- `8px` (`0.5rem`): `p-2`, `px-2`, `py-2`, `gap-2`, `mb-2`, `mt-2`, `space-y-2`
- `16px` (`1rem`): `p-4`, `px-4`, `py-4`, `gap-4`, `mb-4`, `mt-4`, `space-y-4`
- `24px` (`1.5rem`): `p-6`, `px-6`, `py-6`, `gap-6`, `mb-6`, `mt-6`, `space-y-6`
- `32px` (`2rem`): `p-8`, `px-8`, `py-8`, `gap-8`, `mb-8`, `mt-8`
- Non-multiple values (`p-1.5`, `p-2.5`, `p-3`, `p-3.5`, `gap-1.5`, `gap-2.5`, `gap-3`, `mb-3`, etc.) are prohibited.

## 2. Colori: Una sola palette neutra, niente gradienti e niente glow
- **Single Neutral Palette (`Zinc`)**:
  - Canvas background: `#09090b` (`zinc-950`)
  - Primary card surface: `#18181b` (`zinc-900`)
  - Interactive / inset surface: `#27272a` (`zinc-800`)
  - Hairline borders: `#27272a` (`border-zinc-800`) and `#3f3f46` (`border-zinc-700`)
  - Primary text: `#fafafa` (`text-zinc-100`)
  - Secondary text: `#a1a1aa` (`text-zinc-400`)
  - Muted text: `#71717a` (`text-zinc-500`)
- **Zero Gradients**: No `linear-gradient`, `radial-gradient`, or `bg-gradient-to-*`.
- **Zero Glow**: No colored drop shadows (`shadow-*-500/*`), neon borders, or ambient light blobs.

## 3. Emoticon: Sostituite con icone a linea dalla stessa libreria
- Zero Unicode emojis in UI labels, buttons, badges, or forms.
- All icons come exclusively from **`lucide-react`** with a consistent line stroke (`strokeWidth={1.75}`).

## 4. Testi: Al massimo due pesi per font. Non usare il maiuscolo
- **Maximum 2 Font Weights**:
  - `400` (`font-normal`) for body copy, descriptions, inputs, and secondary labels.
  - `600` (`font-semibold`) for headings, key metrics, and active controls.
  - Weights `500` (`font-medium`), `700` (`font-bold`), `800` (`font-extrabold`), and `900` (`font-black`) are not used.
- **No Uppercase**:
  - `uppercase` utility classes are forbidden.
  - All labels, badges, and section headers use natural sentence case.

## 5. Numeri: Senza decorazioni, con il confronto rispetto al mese prima
- KPI numbers and counters are displayed cleanly in tabular monospace (`JetBrains Mono`, `tabular-nums`) without decorative pill wrappers or colored icon boxes.
- Every primary metric includes its direct comparison against the previous month (`rispetto al mese prima`).
