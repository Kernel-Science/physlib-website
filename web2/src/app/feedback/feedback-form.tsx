"use client";

import { useState, type FormEvent } from "react";

const formBase = "https://docs.google.com/forms/d/e/1FAIpQLSes5FBhowyFhR1krJr3F6Q9sbvjlyJw8N6akQ789ydUWbBvQg";
const fields = {
  mode: "entry.2115964153",
  details: "entry.18172721",
  link: "entry.1795863455",
  name: "entry.858958384",
  affiliation: "entry.2115084402",
  permissions: "entry.1939108036",
};

export function FeedbackForm({ mode }: { mode: "experience" | "suggestion" }) {
  const experience = mode === "experience";
  const modeLabel = experience ? "Share an experience" : "General feedback";
  const frameName = `physlib-feedback-response-${mode}`;
  const [showResponse, setShowResponse] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);

  function checkDraft(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const message = form.elements.namedItem(fields.details) as HTMLTextAreaElement;
    if (!message.value.trim()) {
      event.preventDefault();
      message.setCustomValidity("Please write a message first.");
      message.reportValidity();
      return;
    }

    setShowResponse(true);
  }

  return (
    <div className="mt-6">
      <form action={formBase + "/formResponse?embedded=true"} method="post" target={frameName}
        hidden={showResponse} onSubmit={checkDraft}>
        <input type="hidden" name={fields.mode} value={modeLabel} />
        <p className="mb-5 leading-relaxed text-muted">
          {experience
            ? "You might share a calculation you checked, a project you built, or a class where you used Physlib."
            : "Suggest a topic for Physlib, tell us where you got stuck, or point us to a project we should know about."}
        </p>
        <fieldset className="flex min-w-0 flex-col gap-5">
          <label className="block text-sm font-medium">
            {experience ? "How have you used Physlib?" : "Your feedback"}
            <textarea
              name={fields.details} required rows={6} maxLength={6000}
              onChange={event => event.target.setCustomValidity("")}
              className="site-field mt-2 block h-auto w-full resize-y border-muted py-2"
            />
          </label>
          {experience && (
            <div className="grid gap-4">
              <label className="block text-sm font-medium">
                Name <span className="font-normal text-muted">(optional)</span>
                <input name={fields.name} autoComplete="name" maxLength={120} className="site-field mt-2 block w-full border-muted" />
              </label>
              <label className="block text-sm font-medium">
                Affiliation <span className="font-normal text-muted">(optional)</span>
                <input name={fields.affiliation} autoComplete="organization" maxLength={200} className="site-field mt-2 block w-full border-muted" />
              </label>
            </div>
          )}
          <label className="block text-sm font-medium">
            {experience ? "Project or paper link" : "Link to the issue or example"}{" "}
            <span className="font-normal text-muted">(optional)</span>
            <input name={fields.link} type="url" pattern="https?://.+" title="Use an http or https link." maxLength={2048} placeholder="https://" className="site-field mt-2 block w-full border-muted" />
          </label>
          {experience && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">
                Physlib may quote my words <span className="font-normal text-muted">(optional)</span>
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={fields.permissions} value="In grant proposals" className="size-4 accent-accent" />
                In grant proposals as an example of how Physlib is used
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={fields.permissions} value="On the Physlib website" className="size-4 accent-accent" />
                On the Physlib website
              </label>
            </fieldset>
          )}
          <button
            type="submit"
            className="inline-flex min-h-10 items-center self-start rounded-(--radius) bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Send feedback
          </button>
        </fieldset>
      </form>
      <div hidden={!showResponse}>
        <iframe
          key={frameVersion} title="Response from Google Forms" name={frameName}
          className="h-80 w-full rounded-(--radius) border border-border"
          referrerPolicy="no-referrer"
        />
        <button type="button" onClick={() => {
          setShowResponse(false);
          setFrameVersion(version => version + 1);
        }} className="mt-3 text-sm text-accent underline underline-offset-2">
          Back to your draft
        </button>
        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer">Can’t see Google’s response?</summary>
          <p className="mt-2">
            Your draft is still here. You can also{" "}
            <a href={formBase + "/viewform"} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              open the form directly
            </a>.
          </p>
        </details>
      </div>
    </div>
  );
}
