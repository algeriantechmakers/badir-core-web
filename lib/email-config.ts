const emailConfig = {
  contactEmail: process.env.CONTACT_EMAIL || "help.badir@gmail.com",
  fromEmail: process.env.SMTP_FROM_EMAIL || "noreply@updates.badir.space",
};

export default emailConfig;
