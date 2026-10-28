import { useEffect, useRef } from 'react';

const IDLE_DELAY_MS = 500;
const LERP_FACTOR = 0.25;
/** Hard ceiling on rotation per animation frame, in degrees. */
const MAX_STEP_DEG = 9;

export function PlaneCursor() {
  const planeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduced || !finePointer) return;

    const plane = planeRef.current;
    if (!plane) return;

    const root = document.documentElement;
    let idleTimer: number | null = null;
    let rafId: number | null = null;

    let lastX = 0;
    let lastY = 0;
    let posX = 0;
    let posY = 0;

    let renderedAngle = 0;
    let targetAngle = 0;
    let shown = false;

    const applyTransform = () => {
      plane.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%) rotate(${renderedAngle}deg)`;
    };

    const show = () => {
      if (shown) return;
      shown = true;
      plane.classList.add('cursor-plane-visible');
      root.classList.add('cursor-plane-active');
    };

    const hide = () => {
      if (!shown) return;
      shown = false;
      plane.classList.remove('cursor-plane-visible');
      root.classList.remove('cursor-plane-active');
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const tick = () => {
      const remainingDelta = targetAngle - renderedAngle;
      if (Math.abs(remainingDelta) < 0.1) {
        renderedAngle = targetAngle;
        applyTransform();
        rafId = null;
        return;
      }

      // Bound the per-frame step: a plain 25% lerp of a large delta (a sharp
      // direction change) still snaps ~85deg in one frame, which reads as a
      // break. Constant-speed catch-up keeps every turn continuous.
      const eased = remainingDelta * LERP_FACTOR;
      const step = Math.max(-MAX_STEP_DEG, Math.min(MAX_STEP_DEG, eased));
      renderedAngle += step;
      applyTransform();
      rafId = requestAnimationFrame(tick);
    };

    const startRafLoop = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('canvas, .canvas-stage-wrapper')) {
        hide();
        return;
      }

      posX = event.clientX;
      posY = event.clientY;
      plane.classList.remove('cursor-plane-idle');

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      if (Math.hypot(dx, dy) >= 1) {
        const rawTarget = (Math.atan2(dy, dx) * 180) / Math.PI + 45;
        const delta = ((rawTarget - renderedAngle + 540) % 360) - 180;
        targetAngle = renderedAngle + delta;
        startRafLoop();
      }
      // Pointer position stays 1:1 immediately
      applyTransform();
      show();

      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        plane.classList.add('cursor-plane-idle');
      }, IDLE_DELAY_MS);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      root.classList.remove('cursor-plane-active');
    };
  }, []);

  return (
    <div ref={planeRef} className="cursor-plane" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M22 2L15 22L11 13L2 9L22 2Z"
          fill="var(--sun)"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 2L11 13"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
