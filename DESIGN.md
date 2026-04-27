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
Our palette is rooted in the Telemedicina brand blues, but refined into a sophisticated functional hierarchy.

*   **Primary (`#005bbf`):** Reserved for high-priority actions and brand-defining moments.
*   **Tonal Depth:** We utilize the `surface-container` tiers (Lowest to Highest) to create a sense of physical layering.
*   **The "No-Line" Rule:** Explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit directly against a `background` (`#f8f9fa`) to denote a change in content without the "noise" of a line.
*   **The "Glass & Gradient" Rule:** Use `surface_container_lowest` with a 70-80% opacity and a `backdrop-blur` (20px-40px) for floating navbars or modal elements. Main CTAs should utilize a subtle linear gradient from `primary` to `primary_container` to add "soul" and dimension.

---

## 3. Typography
The system employs a dual-typeface strategy to balance clinical authority with modern accessibility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech" feel. Use `display-lg` (3.5rem) for hero statements to command attention.
*   **Body & Titles (Inter):** The workhorse of the system. Inter provides exceptional legibility for medical data and instructions.
*   **Visual Hierarchy:**
    *   **Editorial Authority:** Use `headline-lg` for section headers with significant `letter-spacing` (-0.02em) to mimic premium editorial design.
    *   **Instructional Clarity:** `body-md` is the default for all patient-facing medical information, ensuring no ambiguity in the user experience.

---

## 4. Elevation & Depth
In this system, depth is a function of light and layering, not structural shadow.

*   **The Layering Principle:** Stacking surface tiers is the primary method of hierarchy. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f3f4f5) background to create a soft, natural lift.
*   **Ambient Shadows:** When an element must "float" (like a Prescription Chip or a Doctor Card), use a shadow tinted with `on-surface` (#191c1d) at 4% opacity. The blur should be expansive (30px-60px) to mimic natural ambient light.
*   **The "Ghost Border" Fallback:** If a container requires definition for accessibility, use the `outline-variant` token at 15% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** To achieve the "Antigravity" feel, floating elements should use semi-transparent surfaces, allowing the underlying "dot animation" or background gradients to bleed through subtly.

---

## 5. Components

### Buttons
*   **Primary:** `surface-tint` fill, `on-primary` text. Use `full` roundedness (pill shape).
*   **Secondary:** `outline-variant` at 20% opacity for the "Ghost Border," `primary` text.
*   **Interactive State:** On hover, primary buttons should scale slightly (1.02x) with a smooth 300ms transition.

### Cards & Lists
*   **Zero-Divider Policy:** Strictly forbid horizontal lines. Use vertical white space (`1.5rem` to `2rem`) or subtle shifts to `surface-container-high` to separate list items.
*   **The "Lift" Card:** Cards should use `surface-container-lowest` and an Ambient Shadow. No borders.

### Input Fields
*   **High-Tech Input:** Use `surface-container-low` for the field background. The label should use `label-md` in `on-surface-variant`. Upon focus, the background shifts to `surface-container-lowest` with a `primary` ghost-border.

### The Cursor (Dot Animation)
*   **Behavior:** A 6px solid dot (`primary`) followed by a 24px diffused ring (10% opacity `primary`).
*   **Interaction:** When hovering over a clickable component, the dot expands to 40px, becoming a semi-transparent "lens" that highlights the target.

---

## 6. Do’s and Don'ts

### Do:
*   **Embrace Whitespace:** If a section feels crowded, double the padding. This is a premium experience; let the content breathe.
*   **Layer Surfaces:** Use `surface-container-highest` for small UI accents like "New Message" badges to make them pop against lower-tier backgrounds.
*   **Use Subtle Motion:** All state changes (hover, focus, active) must be eased (Cubic-Bezier 0.4, 0, 0.2, 1).

### Don't:
*   **Don't use "Pure Black":** Use `on-surface` (#191c1d) for text to maintain a softer, more sophisticated contrast.
*   **Don't use standard Drop Shadows:** Avoid the "fuzzy grey line" look. If it's not an Ambient Shadow (diffused and tinted), it doesn't belong.
*   **Don't use Dividers:** If you feel the need for a line, try using a 16px vertical gap or a 2% color shift instead. High-end design is defined by what you leave out.