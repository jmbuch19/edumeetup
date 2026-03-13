// Common disposable/temporary email domains
export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org',
  'throwam.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'spam4.me', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'dispostable.com', 'maildrop.cc', 'yopmail.com', 'yopmail.fr',
  'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx',
  'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
  'tempr.email', 'discard.email', 'spamgourmet.com', 'spamgourmet.net',
  'spamgourmet.org', 'spamspot.com', 'spamthisplease.com',
  'fakeinbox.com', 'mailnull.com', 'spamcorpse.com', 'binkmail.com',
  'bob.email', 'mailin8r.com', 'mailinator2.com', 'notmailinator.com',
  'superrito.com', 'tradermail.info', 'objectmail.com', 'obobbo.com',
  'tempemail.net', 'tempinbox.com', 'tempinbox.co.uk',
  'spamherelots.com', 'spamhereplease.com'
]

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain)
}
