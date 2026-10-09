import LegalLayout from '../components/LegalLayout.jsx'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../data/site.js'
import { Link } from 'react-router-dom'
export default function Terms() {
  return (<LegalLayout title="Terms of Service" updated={LEGAL_UPDATED}>
    <p className="legal-note">These terms are written in plain language and are informational. They have not been reviewed by a lawyer and are not legal advice. By creating an account or using TrackMyKita you agree to them. If you do not agree, please do not use the service.</p>

    <h2>What TrackMyKita is</h2>
    <p>TrackMyKita is a personal finance tracking and organizing tool. You enter your own income, expenses, categories and budgets, and the app shows them back to you in lists, totals and reports. It does not connect to banks, move money, hold funds, or process payments. TrackMyKita is not a bank, lender, investment adviser or financial institution.</p>

    <h2>Not financial advice</h2>
    <p>Nothing in TrackMyKita is financial, investment, tax or legal advice, and it does not replace advice from a qualified professional. Totals, balances and reports are calculated only from what you enter. They are not bank balances, and amounts are not converted when you change currency. We make no promise that using TrackMyKita will help you save money, reduce debt or reach any financial goal.</p>

    <h2>Your account</h2>
    <ul>
      <li>Give accurate sign-up details and keep your email address up to date.</li>
      <li>Keep your password private. You are responsible for activity under your account, so tell us promptly if you think someone else has gained access.</li>
      <li>You can delete your account at any time in Settings. Deletion is permanent.</li>
    </ul>

    <h2>Acceptable use</h2>
    <p>Please do not:</p>
    <ul>
      <li>use TrackMyKita for anything unlawful, or upload images or text that are unlawful or that you have no right to use;</li>
      <li>try to access another person's account or records, or to get around the app's security;</li>
      <li>probe, overload or disrupt the service, or use automated tools to access it in bulk;</li>
      <li>copy, resell or pass off the app, its design or its branding as your own.</li>
    </ul>

    <h2>Your information</h2>
    <p>The records you enter remain yours. You allow us to store and process them only to run TrackMyKita for you. How we handle information is described in the <Link to="/privacy">Privacy Policy</Link>. You are responsible for the accuracy of what you enter and for keeping your own copies. You can export your transactions as a CSV file in Settings.</p>

    <h2>Availability and changes</h2>
    <p>TrackMyKita is provided as it is. We aim to keep it available and working, but it may be interrupted, changed or discontinued, and we cannot promise it will be free of errors or data loss. We may add, change or remove features. If we make significant changes to these terms, we will update the date at the top of this page.</p>

    <h2>Ending your access</h2>
    <p>You may stop using TrackMyKita at any time. We may suspend or close an account that breaks these terms or puts the service or other people at risk.</p>

    <h2>Ownership</h2>
    <p>The TrackMyKita app, name, logo and design are © 2026 CJ. Third-party open-source components used in the app remain under their own licenses.</p>

    <h2>Disclaimers and limits</h2>
    <p>To the extent allowed by law, TrackMyKita is provided without warranties of any kind, and CJ is not liable for losses that result from using or being unable to use the service, including losses from incorrect entries, interruptions or loss of data. Nothing in these terms limits any rights you have under the law that cannot be limited.</p>

    <h2>Contact</h2>
    <p>Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
  </LegalLayout>)
}
