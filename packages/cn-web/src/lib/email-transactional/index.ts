// @piparo/email-transactional Engine — transactional e-mail (capability email-transactional; 1:1
// module). nodemailer transport + a versioned/translated react-email template registry. Dev →
// MailDev; prod → SMTP provider (SES, Postmark, Resend, SendGrid). Vendored into the web showcase:
// the isomorphic trigger client + the Blueprint config contract + a browser-safe template catalogue.
// The server-only layers (the react-email render + nodemailer mail sender + backend/) are skipped;
// the demo mocks the client seam.
export * from './config'
export * from './client'
export * from './templates'
