# Design System Document: High-End Telemedicine Experience

## 1. Overview & Creative North Star
**Creative North Star: "The Clinical Ethereal"**

This design system transcends the typical "medical portal" by merging the precision of high-tech instrumentation with an airy, weightless aesthetic inspired by the Google Antigravity philosophy. We are moving away from rigid, boxy layouts toward a "Digital Curator" experience—where information isn't just displayed; it is presented with intentionality and breathing room.

To break the "template" look, this system utilizes:
*   **Intentional Asymmetry:** Hero elements and feature sections should avoid perfect 50/50 splits. Use overlapping containers to create a sense of forward momentum.
*   **High-Contrast Scale:** Dramatically oversized Display typography paired with ultra-clean, functional body text.
*   **The Cursor Interaction:** A custom 'dot animation' serves as a high-tech focal point, trailing the user’s movement to signify precision and responsiveness.

---

## 2. Colors
Our palette is rooted in the Telemedicina brand blues, refined into a sophisticated functional hierarchy defined directly in `src/styles/globals.css`.

*   **Primary (`--color-primary-500` / `#005bbf`):** Reserved for high-priority actions and brand-defining moments.
*   **Tonal Depth:** We utilize background tokens (`--bg-primary` for layout base, `--bg-secondary` for secondary panels, and `--bg-tertiary` for subtle accent areas) to create physical layering.
*   **The "No-Line" Rule:** Explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `--bg-secondary` section should sit directly against a `--bg-primary` background to denote a change in content without the "noise" of a line.
*   **The "Glass & Gradient" Rule:** Use the `.glass` utility class (combining `backdrop-filter: blur(10px)` and semi-transparent backgrounds) for floating navbars or modal elements. Main CTAs should utilize the premium linear gradient `--gradient-primary` to add depth, soul, and dimension.

---

## 3. Typography
The system employs a dual-typeface strategy to balance clinical authority with modern accessibility, imported directly in `globals.css` from Google Fonts (Inter + Manrope).

*   **Display & Headlines (`--font-display` / Manrope):** Chosen for its geometric precision and modern "tech" feel. Used for title headers and hero statements to command attention.
*   **Body & Titles (`--font-family` / Inter):** The workhorse of the system. Inter provides exceptional legibility for medical data, chat screens, and prescription instructions.
*   **Visual Hierarchy:**
    *   **Editorial Authority:** Use display sizes (`--font-size-4xl` to `--font-size-6xl`) with geometric letter-spacing for main dashboards to mimic premium editorial design.
    *   **Instructional Clarity:** Standard sizes (`--font-size-base` / `1rem` and `--font-size-sm` / `0.875rem`) are default for all patient-facing medical information, ensuring absolute legibility.

---

## 4. Elevation & Depth
In this system, depth is a function of light, blurring, and layering, not harsh structural shadows.

*   **The Layering Principle:** Stacking background surface tiers is the primary method of hierarchy. Place a `--card-bg` (#ffffff) card on a `--bg-secondary` (#f4f7fa) background to create a soft, natural lift.
*   **Ambient Shadows:** When an element must "float" (like a Prescription Card or a Doctor Chip), use our highly diffused shadows (`--shadow-lg` or `--shadow-xl`), which use soft alphas to mimic natural ambient light without the "dirty gray line" look.
*   **The "Ghost Border" Fallback:** If a container requires definition for accessibility, use `--border-color` (`#e5e7eb` in light mode) with a soft hover transition to `--color-primary-400`. Never use 100% opaque borders.
*   **Glassmorphism:** To achieve the weightless feel, floating elements should use `.glass` classes, allowing the underlying background gradients to bleed through classily.

---

## 5. Components

### Buttons
*   **Primary:** Filled with the premium linear gradient `--gradient-primary` or `--color-primary-500`, with white text. Use `--radius-full` (pill shape) for high-end organic flow.
*   **Secondary:** Outlined using `--border-color` with `--color-primary-600` or `--text-primary` text.
*   **Interactive State:** On hover, primary buttons should trigger smooth transitions (`--transition-base`) to scale slightly (1.02x) or shift to `--gradient-primary-hover`.

### Cards & Lists
*   **Zero-Divider Policy:** Strictly forbid horizontal lines. Use vertical spacing (`--spacing-lg` to `--spacing-xl`) or card containers (`--card-bg`) to separate list items.
*   **The "Lift" Card:** Cards should use `--card-bg` and `--shadow-md` with `--radius-lg` / `--radius-xl`.

### Input Fields
*   **High-Tech Input:** Default state uses `var(--card-bg)` or `var(--bg-secondary)` as field background. Upon focus, the input transitions cleanly to `--color-primary-500` border with a subtle sky blue focus ring (`box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15)`).

### The Cursor (Dot Animation)
*   **Behavior:** A 6px solid dot (`--color-primary-500`) followed by a 24px diffused ring (10% opacity `--color-primary-500`).
*   **Interaction:** When hovering over a clickable component, the dot expands to 40px, becoming a semi-transparent "lens" that highlights the target with a cubic-bezier transition.

---

## 6. Do’s and Don'ts

### Do:
*   **Embrace Whitespace:** If a section feels crowded, double the padding (`--spacing-xl` or `--spacing-2xl`). This is a premium experience; let the content breathe.
*   **Layer Surfaces:** Use `--bg-tertiary` or `--bg-secondary` for background layouts, and `--card-bg` for interactive items to create soft layers.
*   **Use Subtle Motion:** All state changes (hover, focus, active) must use our eased transitions (`--transition-base` / `450ms cubic-bezier(0.4, 0, 0.2, 1)`).

### Don't:
*   **Don't use "Pure Black":** Use `--text-primary` (`#111827`) for body text and headers to maintain a softer, premium contrast.
*   **Don't use standard Drop Shadows:** Avoid simple dark offsets. Only use the curated ambient shadows (`--shadow-md` to `--shadow-2xl`) defined in the CSS variables.
*   **Don't use Dividers:** If you feel the need for a line, try using vertical whitespace gaps (`--spacing-lg`) or subtle background shifts instead. Premium design is defined by what you leave out.