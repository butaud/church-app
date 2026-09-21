export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !from) {
    console.error("Resend not configured; skipping email to", args.to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });
  if (!res.ok) {
    console.error("Failed to send email to", args.to, await res.text());
  }
}
