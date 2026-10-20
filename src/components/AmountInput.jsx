import { useLayoutEffect, useRef, useState } from 'react'
import { evaluateAmount } from '../utils/expression.js'
import { money } from '../utils/format.js'
// The amount box of the transaction form. The person types a number or a calculation (100+200); while the text is a VALID calculation, its result is
// shown inside the box, on the right, as a small opaque label. The text stays exactly as typed (and is what is validated on submit by the same safe
// parser, evaluateAmount, which never uses eval). Nothing is shown for an empty, incomplete, invalid, zero, negative or too-large expression, so a
// result is never misleading, and a plain number shows no result because it would only repeat what is typed.
//
// The label has the same background as the box and its width follows its text. The input reserves exactly that width as right padding (measured, not
// guessed), so the caret and the text being edited always stay in the visible part to its left, and a long expression continues underneath the label.
// `id` and `aria-describedby` are passed in by <Field>; they belong on the <input>, not on the wrapper.
export default function AmountInput({ value, onChange, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, autoFocus, placeholder = '0.00' }) {
  const calc = evaluateAmount(value), result = calc.ok && calc.isExpression ? money(calc.amount) : null
  const label = useRef(), [pad, setPad] = useState(null)
  useLayoutEffect(() => { setPad(result && label.current ? Math.ceil(label.current.offsetWidth) + 18 : null) }, [result])
  return (<div className={'amt' + (result ? ' has-result' : '')}>
    <input id={id} className="input amt-input" type="text" inputMode="text" enterKeyHint="done" autoComplete="off" spellCheck={false} placeholder={placeholder}
      value={value} onChange={onChange} aria-invalid={invalid} aria-describedby={describedBy} autoFocus={autoFocus} style={pad ? { paddingRight: pad } : undefined} />
    {result && <span ref={label} className="amt-result" role="status" aria-label={`Result ${result}`}><span aria-hidden="true" className="amt-eq">=</span> <span aria-hidden="true">{result}</span></span>}
  </div>)
}
