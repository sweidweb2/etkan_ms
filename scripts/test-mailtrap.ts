import { MailtrapClient } from "mailtrap";
import { SITE } from "@/lib/config/site";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

async function main() {
  loadEnvLocal();

  const token = process.env.MAILTRAP_API_KEY;
  const fromEmail = process.env.MAILTRAP_FROM_EMAIL;
  const fromName = process.env.MAILTRAP_FROM_NAME ?? SITE.systemName;
  const to = process.env.MAILTRAP_TEST_TO ?? "asweid657@gmail.com";

  if (!token) {
    throw new Error("MAILTRAP_API_KEY is not set in .env.local");
  }

  if (!fromEmail) {
    throw new Error(
      "MAILTRAP_FROM_EMAIL is not set. Use an address on your verified Mailtrap domain (e.g. noreply@etkan.org)."
    );
  }

  const client = new MailtrapClient({ token });

  console.log(`Sending Mailtrap test email to ${to} from ${fromEmail}…`);

  const response = await client.send({
    from: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject: `${SITE.systemName} — Mailtrap test`,
    text: `This is a test email from ${SITE.systemName} via Mailtrap.`,
    html: `<p>This is a test email from <strong>${SITE.systemName}</strong> via Mailtrap.</p>`,
  });

  console.log("Mailtrap test succeeded.");
  console.log(
    "Message IDs:",
    response.message_ids?.join(", ") || "(none returned)"
  );
}

main().catch((error) => {
  console.error("Mailtrap test failed:", error);
  process.exitCode = 1;
});
