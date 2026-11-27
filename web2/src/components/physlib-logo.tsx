export function PhyslibLogo() {
  return (
    <svg
      viewBox="-12 0 964 275"
      aria-hidden="true"
      className="physlib-wordmark block h-auto w-full text-foreground"
    >
      {/* Git-fork style: heavy lines, big hollow ring nodes, no dot at the vertex. The line in from
          the left carries straight on as the wavy photon; one branch splits off at a sharp angle,
          then curves smoothly until it runs level. Lines stop at the outer edge of each ring. */}
      <g fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 238 H462" />
        <path d="M462 238 L704 98.3 C726.5 85.3 740 84 754 84 H876" />
        <path strokeWidth="7" d="M462.0 238.0 L464.5 238.2 L467.0 238.7 L469.5 239.6 L472.0 240.8 L474.5 242.1 L477.0 243.4 L479.5 244.7 L482.0 245.8 L484.5 246.6 L487.0 247.0 L489.5 246.9 L492.0 246.3 L494.5 245.0 L497.0 243.0 L499.5 240.5 L502.0 238.0 L504.5 235.5 L507.0 233.0 L509.5 230.8 L512.0 228.8 L514.5 227.2 L517.0 226.0 L519.5 225.2 L522.0 225.0 L524.5 225.2 L527.0 226.0 L529.5 227.2 L532.0 228.8 L534.5 230.8 L537.0 233.0 L539.5 235.5 L542.0 238.0 L544.5 240.5 L547.0 243.0 L549.5 245.2 L552.0 247.2 L554.5 248.8 L557.0 250.0 L559.5 250.8 L562.0 251.0 L564.5 250.8 L567.0 250.0 L569.5 248.8 L572.0 247.2 L574.5 245.2 L577.0 243.0 L579.5 240.5 L582.0 238.0 L584.5 235.5 L587.0 233.0 L589.5 230.8 L592.0 228.8 L594.5 227.2 L597.0 226.0 L599.5 225.2 L602.0 225.0 L604.5 225.2 L607.0 226.0 L609.5 227.2 L612.0 228.8 L614.5 230.8 L617.0 233.0 L619.5 235.5 L622.0 238.0 L624.5 240.5 L627.0 243.0 L629.5 245.2 L632.0 247.2 L634.5 248.8 L637.0 250.0 L639.5 250.8 L642.0 251.0 L644.5 250.8 L647.0 250.0 L649.5 248.8 L652.0 247.2 L654.5 245.2 L657.0 243.0 L659.5 240.5 L662.0 238.0 L664.5 235.5 L667.0 233.0 L669.5 230.8 L672.0 228.8 L674.5 227.2 L677.0 226.0 L679.5 225.2 L682.0 225.0 L684.5 225.2 L687.0 226.0 L689.5 227.2 L692.0 228.8 L694.5 230.8 L697.0 233.0 L699.5 235.5 L702.0 238.0 L704.5 240.5 L707.0 243.0 L709.5 245.2 L712.0 247.2 L714.5 248.8 L717.0 250.0 L719.5 250.8 L722.0 251.0 L724.5 250.8 L727.0 250.0 L729.5 248.8 L732.0 247.2 L734.5 245.2 L737.0 243.0 L739.5 240.5 L742.0 238.0 L744.5 235.5 L747.0 233.0 L749.5 230.8 L752.0 228.8 L754.5 227.2 L757.0 226.0 L759.5 225.2 L762.0 225.0 L764.5 225.2 L767.0 226.0 L769.5 227.2 L772.0 228.8 L774.5 230.8 L777.0 233.0 L779.5 235.5 L782.0 238.0 L784.5 240.5 L787.0 243.0 L789.5 245.2 L792.0 247.2 L794.5 248.8 L797.0 250.0 L799.5 250.8 L802.0 251.0 L804.5 250.8 L807.0 250.0 L809.5 248.8 L812.0 247.2 L814.5 245.2 L817.0 243.0 L819.5 240.5 L822.0 238.0 L824.5 235.5 L827.0 233.0 L829.5 231.0 L832.0 229.7 L834.5 229.1 L837.0 229.0 L839.5 229.4 L842.0 230.2 L844.5 231.3 L847.0 232.6 L849.5 233.9 L852.0 235.2 L854.5 236.4 L857.0 237.3 L859.5 237.8 L862.0 238.0 H876" />
      </g>
      <path d="M161 222 L190 238 L161 254 Z" fill="currentColor" />
      <path d="M604.7 155.6 L587.6 184.0 L571.6 156.2 Z" fill="currentColor" />
      <g fill="currentColor" fontSize="154" fontWeight="600" fontStyle="italic">
        <text x="44" y="221">Phys</text>
        <text x="449" y="219" transform="rotate(-30 449 219)" className="physlib-wordmark-mono text-accent/60">lib</text>
      </g>
      <path d="M140 130 L203 118" stroke="currentColor" strokeWidth="8" />
      {/* Hollow ring nodes. */}
      <g fill="none" strokeWidth="8" stroke="currentColor">
        <circle cx="26" cy="238" r="20" />
        <circle cx="896" cy="84" r="20" />
        <circle cx="896" cy="238" r="20" />
      </g>
    </svg>
  );
}
