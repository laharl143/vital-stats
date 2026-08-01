import { useEffect, type RefObject } from "react";

// Soft flowing gradient waves along a section's edge — quiet, ambient motion.
// Pure canvas, no external libraries. Shared between Testimonials (bottom
// edge) and Team (top edge, flip: true) so the two read as one continuous
// wave crossing the seam between them, not just a similar-looking copy.
export function useLiquidWaveBackground(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options?: { flip?: boolean }
) {
  const flip = options?.flip ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    let frameId = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
    }

    function wave(yBase: number, amp: number, freq: number, phase: number, color: string) {
      ctx!.beginPath();
      ctx!.moveTo(0, flip ? 0 : canvas!.height);
      for (let x = 0; x <= canvas!.width; x += 8) {
        const y = yBase + Math.sin(x * freq + phase) * amp;
        ctx!.lineTo(x, y);
      }
      ctx!.lineTo(canvas!.width, flip ? 0 : canvas!.height);
      ctx!.closePath();
      ctx!.fillStyle = color;
      ctx!.fill();
    }

    // Testimonials and Team each mount this hook independently, so a local
    // per-instance counter (t += 0.015 per own rAF tick) would let the two
    // drift out of phase with each other — same speed, but starting from
    // whatever moment each one happened to mount. Driving t from wall-clock
    // time instead means both instances always compute the exact same t at
    // the exact same real-world millisecond, permanently, with nothing to
    // drift. (0.0009 preserves the original ~0.015/frame speed at 60fps.)
    function draw() {
      const t = performance.now() * 0.0009;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      // A fixed pixel band (not a % of each section's own height) so the
      // curve tiles at the same absolute scale on both sides — Testimonials
      // and Team are rarely the same height, and a %-based anchor would
      // otherwise stretch/compress one side's crests relative to the other.
      const band = 130 * dpr;
      const base = flip ? band : canvas!.height - band;
      const dir = flip ? -1 : 1;

      // The three wave() calls below are semi-transparent, so wherever fewer
      // than all three overlap, whatever's underneath shows through and
      // affects the final blended color — normally the section's own CSS
      // background. Testimonials sits on cream (#F7F9F8) and Team sits on
      // white (#FFFFFF); left alone, the same translucent paint blends to
      // two verifiably different colors on each side (confirmed with a
      // color picker: #A9C8BB vs #ADCBBE), so the "one continuous wave"
      // never actually reads as one color. Painting a solid backdrop first,
      // identical on both instances regardless of flip, removes that
      // dependency entirely — the blend is now always onto the same base.
      //
      // This rect must stop exactly where the wave curves themselves stop
      // reaching, or it's just a second, differently-shaped seam (a visible
      // flat cream band past the wavy edge) — the first attempt at this fix
      // used a padded +80dpr guess and produced exactly that regression.
      // layer1 (amplitude 22dpr, no offset from `base`) is the one that
      // reaches furthest from the anchor edge, so band + 22dpr is the true
      // maximum extent of any curve; +2dpr is just antialiasing slack.
      const backdropReach = band + 22 * dpr + 2 * dpr;
      ctx!.fillStyle = "#F7F9F8";
      if (flip) {
        ctx!.fillRect(0, 0, canvas!.width, backdropReach);
      } else {
        ctx!.fillRect(0, canvas!.height - backdropReach, canvas!.width, backdropReach);
      }

      wave(base, 22 * dpr, 0.006, t, "rgba(111,230,184,0.28)");
      wave(base + dir * 20 * dpr, 26 * dpr, 0.008, t * 1.3 + 2, "rgba(46,139,114,0.20)");
      wave(base + dir * 42 * dpr, 18 * dpr, 0.01, t * 0.8 + 4, "rgba(15,74,60,0.14)");
      frameId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    // ResizeObserver catches content-driven height changes (layout shifts,
    // late-loading fonts) — a plain window "resize" listener misses those.
    const parent = canvas.parentElement;
    const observer = parent ? new ResizeObserver(resize) : null;
    if (parent && observer) observer.observe(parent);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [canvasRef, flip]);
}
