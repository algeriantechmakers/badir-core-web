import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailConfig = {
  contactEmail: process.env.CONTACT_EMAIL || "help.badir@gmail.com",
  fromEmail: process.env.SMTP_FROM_EMAIL || "noreply@updates.badir.space",
};

export async function sendMail(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  return transporter.sendMail(options);
}

export async function sendMailBatch(
  messages: Array<{
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
  }>,
  concurrency = 5,
) {
  const results: Array<
    { messageId: string; to: string } | { error: unknown; to: string }
  > = [];

  for (let i = 0; i < messages.length; i += concurrency) {
    const chunk = messages.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map((msg) =>
        transporter.sendMail(msg).then((info) => ({
          messageId: info.messageId,
          to: Array.isArray(msg.to) ? msg.to.join(",") : msg.to,
        })),
      ),
    );
    for (const r of chunkResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({ error: r.reason, to: "unknown" });
      }
    }
  }

  return results;
}

export default emailConfig;
