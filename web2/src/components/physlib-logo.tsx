export function PhyslibLogo() {
  return (
    <svg
      viewBox="0 0 960 275"
      aria-hidden="true"
      className="block h-auto w-full font-mono text-foreground"
    >
      <g fill="none" stroke="currentColor" strokeWidth="4">
        <path d="M7 238 H462 L945 13" />
        <path d="M462 238 C480 260 500 260 518 238 S554 216 572 238 S608 260 626 238 S662 216 680 238 S716 260 734 238 S770 216 788 238 S824 260 842 238 S878 216 896 238 S932 260 950 238" />
      </g>
      {/* Fermion flow enters from the left and exits up and right. */}
      <path d="M161 224 L188 238 L161 252 Z" fill="currentColor" />
      <path d="M747 93 L787 87 L756 113 Z" fill="currentColor" />
      <g fill="currentColor" fontSize="154" fontWeight="600" fontStyle="italic">
        <text x="44" y="221">Phys</text>
        <text x="449" y="219" transform="rotate(-25 449 219)" className="text-accent/60">lib</text>
      </g>
      <path d="M140 130 L203 118" stroke="currentColor" strokeWidth="8" />
    </svg>
  );
}
