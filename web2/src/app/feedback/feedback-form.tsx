"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function FeedbackForm({ mode }: { mode: "experience" | "suggestion" }) {
  const experience = mode === "experience";
  const router = useRouter();
  const submitting = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = String(data.get("details") ?? "").trim();
    if (!message) {
      const field = form.elements.namedItem("details") as HTMLTextAreaElement;
      field.setCustomValidity("Please write a message first.");
      field.reportValidity();
      return;
    }

    const payload = {
      mode,
      details: message,
      link: data.get("link"),
      ...(experience && {
        name: data.get("name"),
        affiliation: data.get("affiliation"),
        quoteProposals: data.has("quoteProposals"),
        quoteWebsite: data.has("quoteWebsite"),
      }),
    };
    submitting.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result?.ok === true) {
        router.replace("/feedback/thank-you");
        return;
      }
      setError(result?.error || "We couldn’t confirm your submission. Your draft is still here.");
    } catch {
      setError("We couldn’t confirm your submission. Your draft is still here.");
    }
    submitting.current = false;
    setSending(false);
  }

  return (
    <form className="mt-6" action="/api/feedback" method="post" onSubmit={sendFeedback}>
      <input type="hidden" name="mode" value={mode} />
      <p className="mb-5 leading-relaxed text-muted">
        {experience
          ? "You might share a calculation you checked, a project you built, or a class where you used Physlib."
          : "Suggest a topic for Physlib, tell us where you got stuck, or point us to a project we should know about."}
      </p>
      <fieldset disabled={sending} className="flex min-w-0 flex-col gap-5">
        <label className="block text-sm font-medium">
          {experience ? "How have you used Physlib?" : "Your feedback"}
          <textarea
            name="details" required rows={6} maxLength={6000}
            onChange={event => event.target.setCustomValidity("")}
            className="site-field mt-2 block h-auto w-full resize-y border-muted py-2"
          />
        </label>
        {experience && (
          <div className="grid gap-4">
            <label className="block text-sm font-medium">
              Name <span className="font-normal text-muted">(optional)</span>
              <input name="name" autoComplete="name" maxLength={120} className="site-field mt-2 block w-full border-muted" />
            </label>
            <label className="block text-sm font-medium">
              Affiliation <span className="font-normal text-muted">(optional)</span>
              <input name="affiliation" autoComplete="organization" maxLength={200} className="site-field mt-2 block w-full border-muted" />
            </label>
          </div>
        )}
        <label className="block text-sm font-medium">
          {experience ? "Project or paper link" : "Link to the issue or example"}{" "}
          <span className="font-normal text-muted">(optional)</span>
          <input name="link" type="url" pattern="https?://.+" title="Use an http or https link." maxLength={2048} placeholder="https://" className="site-field mt-2 block w-full border-muted" />
        </label>
        {experience && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Physlib may quote my words <span className="font-normal text-muted">(optional)</span>
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="quoteProposals" className="size-4 accent-accent" />
              In grant proposals as an example of how Physlib is used
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="quoteWebsite" className="size-4 accent-accent" />
              On the Physlib website
            </label>
          </fieldset>
        )}
        {error && <p role="alert" className="text-sm text-foreground">{error}</p>}
        <button
          type="submit"
          className="inline-flex min-h-10 items-center self-start rounded-(--radius) bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send feedback"}
        </button>
      </fieldset>
    </form>
  );
}
