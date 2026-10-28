import { useEffect, useRef, useState } from 'react';

export function PlaneCursor() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number; angle: number }>({
    x: -100,
    y: -100,
    angle: 0,
  });

  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Check constraints: hover capability and reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hoverSupported = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (prefersReducedMotion || !hoverSupported) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      // If inside canvas stage, keep native grab/grabbing cursor
      const target = e.target as Element | null;
      if (target?.closest('canvas, .canvas-stage-wrapper')) {
        if (visible) {
          setVisible(false);
          document.documentElement.classList.remove('cursor-plane-active');
        }
        return;
      }

      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      // Calculate travel angle if moved significantly
      let angle = position.angle;
      if (Math.hypot(dx, dy) > 1) {
        // SVG plane tip points at -45deg, so add 45 to orient along velocity
        angle = (Math.atan2(dy, dx) * 180) / Math.PI + 45;
      }

      setPosition({ x: e.clientX, y: e.clientY, angle });
      setVisible(true);
      document.documentElement.classList.add('cursor-plane-active');

      // Clear existing idle timer
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }

      // Fade out after 500ms idle
      idleTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        document.documentElement.classList.remove('cursor-plane-active');
      }, 500);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      document.documentElement.classList.remove('cursor-plane-active');
    };
  }, [visible, position.angle]);

  // When not visible or on unmount, ensure cursor style removed
  useEffect(() => {
    if (!visible) {
      document.documentElement.classList.remove('cursor-plane-active');
    }
  }, [visible]);

  return (
    <div
      className="cursor-plane"
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) rotate(${position.angle}deg)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease-out',
        willChange: visible ? 'transform, opacity' : 'auto',
      }}
    >
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
