# PRODUCT.md — Field Service & Project Submittal Management

> Generated & maintained via the **Impeccable** product truth specification (`pbakaus/impeccable`).

## 1. Product Purpose & Core Thesis
**Field Service Management (`gestione-interventi`)** is an offline-capable, mobile-first Progressive Web App (PWA) engineered for MEP, Electrical, ELV, Fire Life Safety (FLS), and BMS engineering operations across international construction and facility sites (**Panvac**, **German Embassy (GEMB)**, **Hilton (GIAA)**, **Eagle Hills**, **Awash Bank**, **Workbank**, **North Logistics**).

It unifies two critical operational streams into one scannable workspace:
1. **Project Submittals, Approvals & Supply Chain Tracking (`project_work`)**: Tracking technical submittals (e.g., 2500 kVA AVR, 400 kVA AVR boards, 6 kVA UPS, MV/LV schematics), awaiting replies, waiting-days counters, 1-click WhatsApp/Email reminders, and 5-stage material supply status (`Nessun Ordine` → `Ordinato` → `In Arrivo` → `Da Ritirare` → `In Cantiere`).
2. **On-Site Technical Interventions & Service Reports (`intervention`)**: Dispatching field technicians, logging hours worked, capturing before/after defect photos, collecting dual digital signatures (Technician + Client), and generating instant PDF reports (single ticket or full project executive summary).

## 2. Target Audience & Personas
- **SuperAdmin / Technical Director (`Costantino`)**: Oversees all multi-site projects, sends technical submittals, monitors waiting-days bottlenecks, chases approvals via 1-click WhatsApp/Email, and exports executive PDF/Excel summaries.
- **Field Technician (`Franco`)**: Uses the app on phone or tablet directly in electrical rooms and construction sites under variable lighting conditions to check checklists, update material arrival, and sign PDF service reports.
- **Project Stakeholders & Clients (`Abiy Taye`, `Michael Tadesse`, `Lukas Van Vuuren`, `Mario Rossi`)**: Receive structured PDF status reports, WhatsApp summaries, and sign off on completed interventions.

## 3. Non-Negotiable Constraints
1. **Zero-Latency Scannability**: Project pills and cards are strictly color-coded by operational state (**Rose** = Open/Unresolved, **Amber** = Active/Awaiting Approval, **Emerald** = All Resolved, **Pink** = Empty/No Tasks).
2. **Mobile & Tablet Field Ergonomics**: Touch targets >= 36px, horizontal scroll-snap pills with hidden scrollbars, safe-area inset compliance, and offline PWA caching.
3. **Anti-Slop Visual Precision**: High-contrast perceptual `oklch()` tokens over refractive Liquid Glass surfaces, distinct 3-tier typography (`Outfit` Display + `Plus Jakarta Sans` UI + `JetBrains Mono` Technical Codes), and tabular numerals everywhere.
