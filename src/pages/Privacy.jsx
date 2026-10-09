import LegalLayout, { Ext } from '../components/LegalLayout.jsx'
import { CONTACT_EMAIL, SITE_URL, LEGAL_UPDATED } from '../data/site.js'
export default function Privacy() {
  return (<LegalLayout title="Privacy Policy" updated={LEGAL_UPDATED}>
    <p className="legal-note">This is a plain-language description of how TrackMyKita handles information. It is informational only. It has not been reviewed by a lawyer, it is not legal advice, and it does not claim that TrackMyKita meets the requirements of any particular law. For legal questions, please speak to a qualified professional.</p>

    <h2>Who we are</h2>
    <p>TrackMyKita ({SITE_URL.replace('https://', '')}) is a personal finance tracker created and run by CJ in the Philippines. In this policy, "we" and "us" mean TrackMyKita and its creator.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account details:</strong> your name and email address, and your password. Passwords are handled by our authentication provider. We do not see or store your password in readable form.</li>
      <li><strong>Profile:</strong> your preferred currency, the date your account was created, and an optional profile picture. Pictures are cropped and resized in your browser before they are uploaded.</li>
      <li><strong>Records you enter:</strong> transactions (type, amount, date, and an optional category, description and notes), categories (name, type and color) and monthly budgets. TrackMyKita does not connect to your bank and does not ask for card or account numbers. Please do not type them into descriptions or notes.</li>
      <li><strong>Technical and usage data:</strong> page views and performance measurements collected through Vercel Web Analytics and Speed Insights (see "Analytics" below), and ordinary technical data such as your IP address that our hosting provider handles when it serves the site to you.</li>
      <li><strong>On your device:</strong> a sign-in session and your light or dark theme choice (see "Cookies and browser storage" below).</li>
    </ul>
    <p>We do not collect your location, contacts, camera or microphone data, or payment details. We do not use advertising trackers, social media logins or session recording.</p>

    <h2>How we use it</h2>
    <ul>
      <li>To run TrackMyKita: sign you in, store your records, and show your dashboard, budgets and reports.</li>
      <li>To send account emails, such as email confirmation, password reset and email change messages.</li>
      <li>To understand whether the site is working and fast, using page view and performance data.</li>
    </ul>
    <p>We do not sell your information, use it for advertising, or build profiles of you.</p>

    <h2>Who handles your information</h2>
    <ul>
      <li><strong>Supabase</strong> provides our database, sign-in system and private file storage. Your account details, records and profile picture are stored there. See <Ext href="https://supabase.com/privacy">Supabase's privacy policy</Ext>.</li>
      <li><strong>Vercel</strong> hosts the website and provides Web Analytics and Speed Insights. See <Ext href="https://vercel.com/legal/privacy-policy">Vercel's privacy policy</Ext>.</li>
      <li><strong>Email delivery:</strong> account emails are sent through the email service set up for TrackMyKita, which receives your email address in order to deliver them.</li>
    </ul>
    <p>Our fonts are served from TrackMyKita itself, so your browser does not contact Google or other font services. Our providers may process information in countries other than the Philippines.</p>

    <h2>Analytics</h2>
    <p>We use Vercel Web Analytics and Speed Insights to count page views and measure loading speed. Before this data is sent, TrackMyKita removes anything after the page address, such as link parameters, and replaces record IDs with a placeholder. We never send transaction amounts, descriptions, budgets, your name, your email address or any other financial or account information to analytics. Vercel describes its Web Analytics as working without cookies; see Vercel's documentation for details of what it collects and for how long.</p>

    <h2>Cookies and browser storage</h2>
    <p>TrackMyKita's own code does not set cookies. It uses your browser's local storage for two things:</p>
    <ul>
      <li>Your sign-in session, so you stay signed in. This is needed for the app to work, and it is removed when you log out.</li>
      <li>Your theme choice (light or dark), so the app looks the way you chose.</li>
    </ul>
    <p>Because we do not use advertising or tracking cookies, we do not show a cookie banner. You can clear this storage at any time in your browser's site settings, which will sign you out.</p>

    <h2>Security</h2>
    <p>The site is served over HTTPS. Access rules in the database are designed so that each account can only read and change its own records. Profile pictures are kept in private storage and shown through links that expire after about an hour. No online service can be made completely secure, so we cannot guarantee that your information will never be accessed without permission. Please use a strong password that you do not use anywhere else.</p>

    <h2>How long we keep information</h2>
    <p>We keep your information while your account exists. You can delete individual transactions, budgets and categories at any time. You can download your transactions as a CSV file from Settings.</p>
    <p>If you delete your account in Settings, your profile, transactions, budgets, categories, profile pictures and sign-in account are permanently removed from our live systems. Our database provider may keep backups for a limited period, so copies of deleted information may remain in those backups until they expire. Analytics data is kept according to Vercel's own practices.</p>

    <h2>Your choices and rights</h2>
    <p>In the app you can edit your name, email address, currency and profile picture, export your transactions, and delete your account. Depending on where you live, privacy laws such as the Philippines' Data Privacy Act of 2012 may give you additional rights, for example to ask what information we hold about you, to have it corrected, or to have it deleted. To make a request or ask a question, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will do our best to respond promptly.</p>

    <h2>Changes to this policy</h2>
    <p>If our practices change, we will update this page and the date at the top.</p>

    <h2>Contact</h2>
    <p>Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
  </LegalLayout>)
}
