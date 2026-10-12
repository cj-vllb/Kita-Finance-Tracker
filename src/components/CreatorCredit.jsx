import cjLogo from '../assets/cj-logo.svg'

// The CJ logo is the creator's mark, not the product logo. It is a transparent SVG; a thin neutral outline inside the file
// keeps its white and black halves readable on the dark landing page and on either app theme.
// The image is decorative: the text beside it ("Created by ...") already says who made the app.
export const CreatorMark = ({ size = 28 }) => (
  <span className="cj-mark" style={{ width: size, height: size }}>
    <img src={cjLogo} alt="" width={size} height={size} decoding="async" loading="lazy" />
  </span>)

export const CreatorCredit = () => (
  <span className="cj-credit"><CreatorMark size={28} /><span>Created by CJ</span></span>)
