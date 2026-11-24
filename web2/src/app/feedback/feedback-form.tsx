"use client";

import { useState, type FormEvent } from "react";

export function FeedbackForm({ mode }: { mode: "experience" | "suggestion" }) {
  const experience = mode === "experience";
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [link, setLink] = useState("");
  const [details, setDetails] = useState("");
  const [quoteProposals, setQuoteProposals] = useState(false);
  const [quoteWebsite, setQuoteWebsite] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [emailDraftUrl, setEmailDraftUrl] = useState("");

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "idle") return;
    const message = details.trim();
    if (!message) {
      const field = event.currentTarget.elements.namedItem("details") as HTMLTextAreaElement;
      field.setCustomValidity("Please write a message first.");
      field.reportValidity();
      return;
    }

    setError("");
    setEmailDraftUrl("");
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(experience
          ? { mode, details: message, name: name.trim(), affiliation: affiliation.trim(), link: link.trim(), quoteProposals, quoteWebsite }
          : { mode, details: message, link: link.trim() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        setError(result?.error || "Your feedback couldn’t be sent. Please try again.");
        if (typeof result?.emailDraftUrl === "string" && result.emailDraftUrl.startsWith("mailto:")) {
          setEmailDraftUrl(result.emailDraftUrl);
        }
        setStatus("idle");
        return;
      }
      setDetails("");
      setName("");
      setAffiliation("");
      setLink("");
      setQuoteProposals(false);
      setQuoteWebsite(false);
      setStatus("sent");
    } catch {
      setError("We couldn’t reach the feedback inbox. Your message is still here.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return <p role="status" className="mt-6">Thanks for writing. Your feedback has been sent to the Physlib team.</p>;
  }

  return (
    <form className="mt-6" onSubmit={sendFeedback} onChange={() => {
      if (error) setError("");
      if (emailDraftUrl) setEmailDraftUrl("");
    }}>
      <p className="mb-5 leading-relaxed text-muted">
        {experience
          ? "You might share a calculation you checked, a project you built, or a class where you used Physlib."
          : "Suggest a topic for Physlib, tell us where you got stuck, or point us to a project we should know about."}
      </p>
      <fieldset disabled={status === "sending"} className="flex min-w-0 flex-col gap-5">
        <label className="block text-sm font-medium">
          {experience ? "How have you used Physlib?" : "Your feedback"}
          <textarea
            name="details" required rows={6} maxLength={6000} value={details}
            onChange={event => { event.target.setCustomValidity(""); setDetails(event.target.value); }}
            className="site-field mt-2 block h-auto w-full resize-y border-muted py-2"
          />
        </label>
        {experience && (
          <div className="grid gap-4">
            <label className="block text-sm font-medium">
              Name <span className="font-normal text-muted">(optional)</span>
              <input name="name" autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)} className="site-field mt-2 block w-full border-muted" />
            </label>
            <label className="block text-sm font-medium">
              Affiliation <span className="font-normal text-muted">(optional)</span>
              <input name="affiliation" autoComplete="organization" maxLength={200} value={affiliation} onChange={e => setAffiliation(e.target.value)} className="site-field mt-2 block w-full border-muted" />
            </label>
          </div>
        )}
        <label className="block text-sm font-medium">
          {experience ? "Project or paper link" : "Link to the issue or example"}{" "}
          <span className="font-normal text-muted">(optional)</span>
          <input name="link" type="url" maxLength={2048} value={link} onChange={e => setLink(e.target.value)} placeholder="https://" className="site-field mt-2 block w-full border-muted" />
        </label>
        {experience && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Physlib may quote my words <span className="font-normal text-muted">(optional)</span>
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quoteProposals} onChange={event => setQuoteProposals(event.target.checked)} className="size-4 accent-accent" />
              In grant proposals as an example of how Physlib is used
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quoteWebsite} onChange={event => setQuoteWebsite(event.target.checked)} className="size-4 accent-accent" />
              On the Physlib website
            </label>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-sm text-foreground">
            {error}{emailDraftUrl && <>{" "}
              <a href={emailDraftUrl} className="text-accent underline underline-offset-2">Open an email draft to Joseph</a>
              {" "}to send it from your own email account.
            </>}
          </p>
        )}
        <button
          type="submit"
          className="inline-flex min-h-10 items-center self-start rounded-(--radius) bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send feedback"}
        </button>
      </fieldset>
    </form>
  );
}
