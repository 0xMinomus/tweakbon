import { useId } from 'react';

/**
 * The hand-drawn Tweakbon wordmark, inlined rather than loaded as an image so it
 * stays crisp at any size, picks up the site's tokens, and never costs a request.
 * Geometry copied verbatim from the design (viewBox 1112 x 254).
 */
const GLYPHS = {
  T: ['M-0.2 6.2 L21.8 5.1 L43.7 4.3 L65.6 2.1 L87.5 1.9', 'M43.0 4.4 L43.3 40.4 L43.6 76.5 L41.5 112.5 L42.1 148.5'],
  W: [
    'M0.6 0.5 L4.6 30.8 L9.2 61.0 L14.8 91.1 L19.6 121.3 L22.7 151.7 L27.6 131.2 L33.4 111.0 L38.6 90.6 L45.3 70.6 L51.1 50.4 L56.8 70.6 L62.2 90.8 L68.3 110.9 L73.6 131.2 L79.8 151.2 L85.5 121.0 L89.9 90.6 L93.9 60.1 L98.0 29.7 L101.8 -0.8',
  ],
  E: [
    'M3.4 1.1 L1.7 37.9 L1.6 74.8 L-0.6 111.6 L-0.8 148.5',
    'M1.6 5.5 L19.0 2.9 L36.6 2.9 L53.8 -0.1 L71.3 -1.8',
    'M3.5 73.7 L16.3 73.6 L29.0 71.5 L41.7 70.2 L54.5 70.5',
    'M-0.5 148.5 L17.8 147.9 L36.2 147.5 L54.6 147.4 L72.9 148.6',
  ],
  A: [
    'M1.0 149.0 L9.1 124.8 L19.3 101.5 L26.7 77.1 L36.8 53.7 L44.4 29.3 L54.2 5.8 L63.7 29.1 L70.9 53.3 L80.2 76.7 L90.4 99.7 L97.9 123.8 L107.7 147.0',
    'M21.1 111.7 L38.2 111.3 L55.1 114.4 L72.3 113.1 L89.3 114.5',
  ],
  K: [
    'M1.2 0.9 L1.9 38.0 L1.4 75.1 L-0.4 112.2 L-0.6 149.3',
    'M77.2 2.3 L58.4 20.9 L41.4 41.1 L23.3 60.3 L5.5 79.8',
    'M35.2 57.0 L45.8 80.5 L58.5 102.9 L70.1 126.0 L80.8 149.5',
  ],
  B: [
    'M0.5 1.5 L0.8 38.8 L-1.1 76.1 L-0.8 113.4 L-0.9 150.7',
    'M2 4 L40 2 C81.0 1.8 80.8 75.8 38.0 74.0 L2 76',
    'M2 76 L44 74 C91.5 72.4 91.7 148.4 42.0 148.0 L0 150',
  ],
  O: ['M46 4 C89.2 0.7 92.9 146.3 48.0 146.0 C0.9 150.2 1.4 4.5 46.0 4.0 Z'],
  N: [
    'M1.3 151.3 L1.0 121.1 L1.8 90.9 L1.1 60.7 L1.8 30.5 L2.9 0.3 L17.9 29.4 L31.5 59.3 L44.4 89.5 L58.3 119.2 L73.5 148.3 L74.4 118.8 L73.8 89.2 L74.1 59.7 L74.7 30.2 L76.6 0.7',
  ],
} as const;

type Glyph = keyof typeof GLYPHS;

/** Each letter sits slightly off its baseline, which is what makes it read as drawn. */
const letters: ReadonlyArray<{ glyph: Glyph; x: number; y: number; angle: number; cx: number; cy: number }> = [
  { glyph: 'T', x: 40, y: 54, angle: -3, cx: 43, cy: 75 },
  { glyph: 'W', x: 169, y: 44, angle: 2, cx: 51, cy: 75 },
  { glyph: 'E', x: 314, y: 56, angle: -2, cx: 36, cy: 75 },
  { glyph: 'A', x: 429, y: 46, angle: 3, cx: 54, cy: 75 },
  { glyph: 'K', x: 580, y: 54, angle: -3, cx: 41, cy: 75 },
  { glyph: 'B', x: 705, y: 45, angle: 2, cx: 42, cy: 75 },
  { glyph: 'O', x: 832, y: 55, angle: -2, cx: 46, cy: 75 },
  { glyph: 'N', x: 967, y: 46, angle: 3, cx: 38, cy: 75 },
];

const passes = [
  { id: 'shadow', stroke: 'var(--ink)', width: 48, offset: 'translate(9 10)' },
  { id: 'outline', stroke: 'var(--ink)', width: 48, offset: undefined },
  { id: 'face', stroke: 'var(--sun)', width: 32, offset: undefined },
];

type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  // React 19 renders useId as «r0»; guillemets break an id reference, so keep it plain.
  const uid = `wm${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;

  return (
    <svg
      className={className}
      viewBox="0 0 1112 254"
      role="img"
      aria-labelledby={`${uid}-title`}
      focusable="false"
    >
      <title id={`${uid}-title`}>Tweakbon</title>
      <defs>
        {letters.map(({ glyph }) => (
          <g id={`${uid}-${glyph}`} key={glyph}>
            {GLYPHS[glyph].map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        ))}
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {passes.map((pass) => (
          <g key={pass.id} stroke={pass.stroke} strokeWidth={pass.width} transform={pass.offset}>
            {letters.map(({ glyph, x, y, angle, cx, cy }) => (
              <use
                key={glyph}
                href={`#${uid}-${glyph}`}
                transform={`translate(${x} ${y}) rotate(${angle} ${cx} ${cy})`}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}
