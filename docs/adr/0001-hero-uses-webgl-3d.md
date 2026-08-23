---
status: accepted
---

# Hero uses a rendered 3D scene, not photography or CSS-only depth

The homepage Hero has no real product photography anywhere in the codebase (`ProductImage` has zero rows), and its current placeholder — a grid-pattern box — was identified as the primary "AI slop" signal driving the [VS-152](https://vital-stats.atlassian.net/browse/VS-152) Hero revamp. Rather than waiting on photography that isn't scheduled, or faking depth with CSS 3D transforms, the Hero's visual centerpiece is a genuine WebGL scene. Chosen for premium/editorial impact that CSS-only motion couldn't match, and because it doesn't depend on photography ever arriving.

**Mobile update:** originally shipped with a static photo fallback on mobile (WebGL is genuinely expensive on mobile GPUs/battery, and this exact failure mode had just been confirmed on a desktop machine). Ed asked for the real capsule on mobile too, explicitly accepting that tradeoff — reverted to showing `<capsule-3d>` on all viewport sizes. The `webglcontextlost` → static-photo fallback (below) is what actually protects mobile now if a phone's GPU can't sustain it, rather than a blanket viewport-based exclusion.

## Implementation pivot

The first implementation (a custom `react-three-fiber` + `@react-three/drei` orb, `MeshTransmissionMaterial`) hit `THREE.WebGLRenderer: Context Lost` on real user hardware — confirmed via the browser console, not just inferred — surviving two rounds of cost-reduction (lower resolution/samples, then dropping `drei` entirely for three.js's native `meshPhysicalMaterial` transmission). Both attempts rendered fine under Playwright's bundled browser but failed identically on the affected machine, pointing to a genuine GPU/driver constraint rather than a code bug — not something further tuning was going to fix.

Replaced with a pre-built vanilla custom element (`public/capsule-3d.js`, defining `<capsule-3d>`), supplied pre-tuned rather than authored in this codebase. It loads `three.js` from `esm.sh` at runtime rather than through the app's bundler — a deliberate tradeoff, not an oversight: `react-three-fiber` and `@react-three/drei` were removed as dependencies (nothing else used them), and rewriting the capsule's carefully-tuned procedural geometry (noise-based soil deformation, triplanar UVs, instanced grass) to import the bundled `three` package instead risked introducing subtle bugs into already-tested math for a marginal reliability gain. A `webglcontextlost` listener was added to it (not present in the original) so a future context loss on other hardware degrades to the static photo instead of a blank canvas.
