import { z } from "zod/v4";

export const runtime = "nodejs";

const maxRequestBytes = 36 * 1024;
const submissionUrl = "https://docs.google.com/forms/d/e/1FAIpQLSes5FBhowyFhR1krJr3F6Q9sbvjlyJw8N6akQ789ydUWbBvQg/formResponse?embedded=true";
const fields = {
  mode: "entry.2115964153",
  details: "entry.18172721",
  link: "entry.1795863455",
  name: "entry.858958384",
  affiliation: "entry.2115084402",
  permissions: "entry.1939108036",
};
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

function readNativeFields(text: string) {
  const values = Object.fromEntries(new URLSearchParams(text));
  return {
    ...values,
    quoteProposals: values.quoteProposals === "on" ? true : values.quoteProposals,
    quoteWebsite: values.quoteWebsite === "on" ? true : values.quoteWebsite,
  };
}

function failure(message: string, status: number, native: boolean) {
  if (native) return new Response(message + " Use your browser’s Back button to return to the form.", { status });
  return Response.json({ error: message }, { status });
}

async function readFeedback(request: Request, native: boolean) {
  // URL-encoded non-ASCII text can take three times as many bytes as JSON.
  const limit = native ? maxRequestBytes * 3 : maxRequestBytes;
  if (Number(request.headers.get("content-length")) > limit) {
    return failure("This response is too long.", 413, native);
  }
  const reader = request.body?.getReader();
  if (!reader) return failure("A response is required.", 400, native);

  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return failure("This response is too long.", 413, native);
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const parsed = feedbackSchema.safeParse(native ? readNativeFields(text) : JSON.parse(text));
    if (!parsed.success) return failure("Check your feedback and try again.", 400, native);
    return parsed.data;
  } catch {
    return failure("The feedback could not be read.", 400, native);
  } finally {
    reader.releaseLock();
  }
}

function googleFields(feedback: z.infer<typeof feedbackSchema>) {
  const experience = feedback.mode === "experience";
  const body = new URLSearchParams();
  body.set(fields.mode, experience ? "Share an experience" : "General feedback");
  body.set(fields.details, feedback.details);
  if (feedback.link) body.set(fields.link, feedback.link);
  if (experience) {
    if (feedback.name) body.set(fields.name, feedback.name);
    if (feedback.affiliation) body.set(fields.affiliation, feedback.affiliation);
    if (feedback.quoteProposals) body.append(fields.permissions, "In grant proposals");
    if (feedback.quoteWebsite) body.append(fields.permissions, "On the Physlib website");
  }
  return body;
}

function containsReceipt(html: string) {
  // The editable form also embeds its configured confirmation text in a script.
  const markup = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  return !/<form\b/i.test(markup)
    && /<(div|p|span)\b[^>]*>\s*Thank you\. Physlib received your feedback\.\s*<\/\1>/i.test(markup);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const native = contentType === "application/x-www-form-urlencoded";
  if (!native && contentType !== "application/json") {
    return failure("Unsupported feedback format.", 415, false);
  }
  const feedback = await readFeedback(request, native);
  if (feedback instanceof Response) return feedback;

  const unconfirmed = "We couldn’t confirm that Google received your feedback.";
  try {
    const response = await fetch(submissionUrl, {
      method: "POST",
      body: googleFields(feedback),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== 200 || response.url !== submissionUrl
        || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "text/html") {
      return failure(unconfirmed, 502, native);
    }
    if (!containsReceipt(await response.text())) return failure(unconfirmed, 502, native);
    if (native) return new Response(null, { status: 303, headers: { Location: "/feedback/thank-you" } });
    return Response.json({ ok: true });
  } catch {
    return failure(unconfirmed, 502, native);
  }
}
