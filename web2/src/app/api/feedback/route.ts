import { createTransport } from "nodemailer";
import { z } from "zod/v4";

export const runtime = "nodejs";

const maxRequestBytes = 36 * 1024;
const josephEmail = "js4814@bath.ac.uk";
const feedbackSchema = z.strictObject({
  mode: z.enum(["experience", "suggestion"]),
  details: z.string().trim().min(1).max(6000),
  name: z.string().trim().max(120).default(""),
  affiliation: z.string().trim().max(200).default(""),
  link: z.string().trim().max(2048).pipe(z.union([
    z.literal(""), z.url({ protocol: /^https?$/ }),
  ])).default(""),
  quoteProposals: z.boolean().default(false),
  quoteWebsite: z.boolean().default(false),
}).refine(data => data.mode === "experience" ||
  (!data.name && !data.affiliation && !data.quoteProposals && !data.quoteWebsite));

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readFeedback(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error("Send feedback as JSON.", 415);
  }
  if (Number(request.headers.get("content-length")) > maxRequestBytes) {
    return error("This response is too long.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return error("A response is required.", 400);

  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxRequestBytes) {
        await reader.cancel();
        return error("This response is too long.", 413);
      }
      chunks.push(value);
    }
    const parsed = feedbackSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) return error("Check your feedback and try again.", 400);
    return parsed.data;
  } catch {
    return error("The feedback could not be read.", 400);
  } finally {
    reader.releaseLock();
  }
}

function formatMessage(feedback: z.infer<typeof feedbackSchema>) {
  const experience = feedback.mode === "experience";
  const sections = [feedback.details];
  if (feedback.link) sections.push(`Related link: ${feedback.link}`);
  if (experience) {
    if (feedback.name) sections.push(`Name: ${feedback.name}`);
    if (feedback.affiliation) sections.push(`Affiliation: ${feedback.affiliation}`);
    sections.push([
      "Permission to quote this experience",
      `In Physlib grant proposals: ${feedback.quoteProposals ? "Yes" : "No"}`,
      `On the Physlib website: ${feedback.quoteWebsite ? "Yes" : "No"}`,
    ].join("\n"));
  }
  return { subject: experience ? "Physlib experience" : "Physlib feedback", text: sections.join("\n\n") };
}

function deliveryFailure(message: ReturnType<typeof formatMessage>) {
  const params = new URLSearchParams({ subject: message.subject, body: message.text.replace(/\r\n|\r|\n/g, "\r\n") });
  const emailDraftUrl = `mailto:${josephEmail}?${params.toString().replace(/\+/g, "%20")}`;
  return Response.json({ error: "Your feedback couldn’t be sent from the website.", emailDraftUrl }, { status: 503 });
}

export async function POST(request: Request) {
  const feedback = await readFeedback(request);
  if (feedback instanceof Response) return feedback;
  const message = formatMessage(feedback);

  const from = process.env.FEEDBACK_FROM?.trim();
  const to = process.env.FEEDBACK_TO?.trim() || josephEmail;
  const smtpUrl = process.env.FEEDBACK_SMTP_URL;
  if (!smtpUrl || !from) return deliveryFailure(message);

  try {
    const url = new URL(smtpUrl);
    if (!["smtp:", "smtps:"].includes(url.protocol) || !url.hostname) return deliveryFailure(message);
    const secure = url.protocol === "smtps:";
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const developmentRelay = loopback && process.env.NODE_ENV !== "production" && !process.env.VERCEL;
    const transport = createTransport({
      host: url.hostname.replace(/^\[|\]$/g, ""),
      port: url.port ? Number(url.port) : secure ? 465 : 587,
      secure,
      requireTLS: !secure && !developmentRelay,
      auth: url.username ? {
        user: decodeURIComponent(url.username),
        pass: decodeURIComponent(url.password),
      } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });

    const result = await transport.sendMail({ from, to, ...message });
    if (!result.accepted.length) return deliveryFailure(message);
    return Response.json({ ok: true });
  } catch {
    return deliveryFailure(message);
  }
}
