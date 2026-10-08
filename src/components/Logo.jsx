// TrackMyKita logo. Geometry is taken 1:1 from the vector artwork in the brand guidelines PDF
// (Integrated Graph K): stem + leg + arm share one stroke weight (x = 66.67) and the 40 degree angle;
// the arm ends in a solid arrowhead. Flat colour only (#0E8A5F), never recoloured per part.
// Coordinates are in the PDF's construction grid: stem is 6x tall (400 units), x = 66.67.
const STEM = '0,400 66.67,400 66.67,0 0,0'
const LEG = '92.86,174.46 361.64,400 257.92,400 50,225.54'
const ARM = '30.95,186.45 134.59,99.49 177.45,150.56 73.81,237.52'
const HEAD = '259.62,38.09 102.06,71.84 199.03,187.4'

export function LogoMark({ size = 28, animated = false }) {
  return (<svg className={'logo-mark' + (animated ? ' logo-anim' : '')} viewBox="0 0 362 400" width={(size * 362) / 400} height={size} fill="currentColor" aria-hidden="true" focusable="false">
    <polygon className="k-stem" points={STEM} /><polygon className="k-leg" points={LEG} />
    <g className="k-arrow"><g className="k-nudge"><polygon points={ARM} /><polygon points={HEAD} /></g></g></svg>)
}

// Lockup: symbol + wordmark in the same green. The wordmark is Poppins Medium, sentence case, default tracking.
export const Logo = ({ size = 28, stacked = false, animated = false }) => (
  <span className={'logo' + (stacked ? ' stacked' : '')} style={{ fontSize: size * (stacked ? 0.36 : 0.72) }}>
    <LogoMark size={size} animated={animated} /><span className="wordmark">TrackMyKita</span></span>)
