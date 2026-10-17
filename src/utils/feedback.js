// Feedback links. The address is passed in (it comes from src/data/site.js, the one contact address the site already uses); nothing is invented here.
export const FEEDBACK_SUBJECT = 'TrackMyKita Feedback'
export const feedbackBody = (version) => `Hi,\n\nI'd like to share some feedback about TrackMyKita${version ? ` (version ${version})` : ''}:\n\n\n\nThank you!`
export const feedbackMailto = (email, version) => `mailto:${email}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(feedbackBody(version))}`
export const feedbackWebLink = (email, version) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(feedbackBody(version))}`
