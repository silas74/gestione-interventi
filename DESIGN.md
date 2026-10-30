---
schema: impeccable/v1
project: gestione-interventi
theme: dark-liquid-glass
colors:
  canvas: "oklch(0.13 0.028 262)"
  surface-1: "oklch(0.21 0.032 260 / 0.64)"
  surface-2: "oklch(0.25 0.035 260 / 0.76)"
  surface-inset: "oklch(0.16 0.025 262 / 0.62)"
  text-primary: "oklch(0.98 0.005 255)"
  text-secondary: "oklch(0.82 0.018 255)"
  text-muted: "oklch(0.66 0.022 255)"
  accent-primary: "oklch(0.62 0.19 255)"
  status-urgent: "oklch(0.63 0.24 22)"
  status-progress: "oklch(0.78 0.17 75)"
  status-resolved: "oklch(0.72 0.18 160)"
  status-empty: "oklch(0.68 0.21 345)"
  border-specular: "oklch(1 0 0 / 0.16)"
typography:
  font-display: "'Outfit', system-ui, -apple-system, sans-serif"
  font-sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
  font-mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
  scale:
    display-lg: { size: "1.5rem", lineHeight: "1.2", tracking: "-0.025em", weight: "800" }
    heading-md: { size: "1.05rem", lineHeight: "1.3", tracking: "-0.02em", weight: "700" }
    body-sm: { size: "0.875rem", lineHeight: "1.5", tracking: "-0.005em", weight: "400" }
    caption-xs: { size: "0.75rem", lineHeight: "1.4", tracking: "0.01em", weight: "600" }
    code-xs: { size: "0.75rem", lineHeight: "1.35", tracking: "0em", weight: "600" }
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  pill: "9999px"
components:
  card-default:
    background: "{colors.surface-1}"
    border: "1px solid {colors.border-specular}"
    radius: "{rounded.lg}"
  button-primary:
    background: "{colors.accent-primary}"
    color: "{colors.text-primary}"
    radius: "{rounded.md}"
---

# DESIGN.md — Impeccable Design System Specification

> Standardized machine- and human-readable visual system (`pbakaus/impeccable`) combined with **Liquid Glass** optical refraction.

## 1. Visual Direction & Spatial Thesis
This interface serves field engineers and project directors managing high-stakes electrical & MEP infrastructure. It combines **industrial telemetry precision** with **Apple-inspired Liquid Glass depth**:
- Specular top-edge highlights (`inset 0 1px 1px oklch(1 0 0 / 0.28)`) separate interactive layers without heavy opaque borders.
- Ambient background orbs provide subtle optical refraction behind translucent cards while preserving strict WCAG AA+ text contrast.

## 2. Three-Tier Typography Architecture (`/impeccable typeset`)
1. **Display & Section Titles (`Outfit`)**: Geometric, high-authority headings with tight letter-spacing (`-0.025em`).
2. **UI & Technical Narrative (`Plus Jakarta Sans`)**: Clean, open-aperture sans-serif optimized for rapid scanning on phones and tablets.
3. **Telemetry, Codes & Counters (`JetBrains Mono`)**: Mandatory `tabular-nums` for ticket codes (`LAV-PANVAC-2026-005`, `LAV-GEMB-2026-001`), waiting-days badges (`⏳ In attesa da Xg`), dates, and hours worked.

## 3. Perceptual OKLCH Color System (`/impeccable colorize`)
Every semantic status uses perceptually calibrated `oklch()` lightness and chroma so badges and card tints remain balanced across dark glass surfaces:
- **Open / Unresolved (Rose)**: `oklch(0.63 0.24 22)`
- **In Progress / Awaiting Reply (Amber)**: `oklch(0.78 0.17 75)`
- **Completed / Approved (Emerald)**: `oklch(0.72 0.18 160)`
- **Empty Project (Pink)**: `oklch(0.68 0.21 345)`

## 4. Corner Radius & Elevation Lock (`/impeccable polish`)
- **Outer Containers & Cards**: `rounded-2xl` (`1rem`)
- **Interactive Buttons & Inputs**: `rounded-xl` (`0.75rem`)
- **Status Badges & Telemetry Chips**: `rounded-lg` (`0.5rem`) or `rounded-full` for pill counters
- **Tactile Physics**: Interactive elements respond with `cubic-bezier(0.22, 1, 0.36, 1)` hover lift and `active:scale-95` physical push feedback.
