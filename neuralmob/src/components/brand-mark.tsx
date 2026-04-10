type BrandGlyphProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandGlyph({ className = "", decorative = true }: BrandGlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`brand-glyph ${className}`.trim()}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative}
      role={decorative ? undefined : "img"}
    >
      <path className="brand-glyph-line" d="M18 46V18" />
      <path className="brand-glyph-line" d="M18 18L46 46" />
      <path className="brand-glyph-line" d="M46 46V18" />
      <path className="brand-glyph-thread" d="M18 32C25 27 31 27 38 32" />
      <path className="brand-glyph-thread" d="M26 20C31 24 35 28 39 34" />
      <circle className="brand-glyph-node brand-glyph-node-soft" cx="18" cy="18" r="4.75" />
      <circle className="brand-glyph-node brand-glyph-node-strong" cx="18" cy="46" r="4.75" />
      <circle className="brand-glyph-node brand-glyph-node-soft" cx="46" cy="18" r="4.75" />
      <circle className="brand-glyph-node brand-glyph-node-strong" cx="46" cy="46" r="4.75" />
      <circle className="brand-glyph-core-ring" cx="32" cy="32" r="8.25" />
      <circle className="brand-glyph-core" cx="32" cy="32" r="4.5" />
    </svg>
  );
}

type BrandMarkProps = {
  className?: string;
  glyphClassName?: string;
};

export function BrandMark({ className = "", glyphClassName = "" }: BrandMarkProps) {
  return (
    <div className={`brand-mark flex items-center justify-center ${className}`.trim()} aria-hidden="true">
      <BrandGlyph className={`brand-glyph--mark ${glyphClassName}`.trim()} />
    </div>
  );
}
