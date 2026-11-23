import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { GitHubProfilePill } from "@/components/github-profile-pill";
import { PageHeader } from "@/components/page-header";
import { getMaintainers } from "@/lib/yaml";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Meet the maintainers and contributors who build Physlib.",
};

async function getContributors() {
  const profiles = new Map<string, string | undefined>();
  const repoPath = new URL(site.github).pathname;
  const url = new URL(`https://api.github.com/repos${repoPath}/contributors`);
  url.searchParams.set("per_page", "100");

  try {
    for (let page = 1; ; page++) {
      url.searchParams.set("page", String(page));
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;

      const contributors: { login?: string; avatar_url?: string }[] = await response.json();
      for (const { login, avatar_url } of contributors) {
        if (login) profiles.set(login, avatar_url);
      }

      if (!response.headers.get("link")?.includes('rel="next"')) {
        return [...profiles].sort(([a], [b]) => a.localeCompare(b, "en"));
      }
    }
  } catch {
    return null;
  }
}

export default async function TeamPage() {
  const [maintainers, contributors] = await Promise.all([getMaintainers(), getContributors()]);

  return (
    <div className="page-frame-editorial">
      <p className="label-mono text-muted mb-5">About</p>
      <h1 className="page-title-editorial">Physlib Team</h1>
      <PageHeader
        id="maintainers"
        title="Maintainers"
        description="The maintainers review and merge pull requests and look after the library."
        className="mt-8"
      />

      <div className="rounded-lg border border-border bg-surface px-5 py-4 text-sm mb-8">
        If you would like to contact the maintainers, please use the{" "}
        <a
          href={site.zulip}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Lean Zulip
        </a>
        .
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {maintainers.map((m) => (
          <Card key={m.name} variant="default" className="h-full">
            <Card.Header>
              <Card.Title>{m.name}</Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90 leading-relaxed">
              {m.summary.trim().split(/\n\s*\n/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Card.Content>
          </Card>
        ))}
      </div>

      <PageHeader id="contributors" title="Contributors" className="mt-12" />
      <p className="text-foreground/90 mb-4">
        Physlib is built by contributors who write and review Lean code, document
        the library, and develop the tools around it.
      </p>
      {contributors ? (
        <ul aria-label="GitHub contributors" role="list" className="mb-6 flex flex-wrap gap-2">
          {contributors.map(([login, avatarUrl]) => (
            <li key={login}>
              <GitHubProfilePill
                label={login}
                avatarUrl={avatarUrl}
                href={`https://github.com/${encodeURIComponent(login)}`}
                lazyAvatar
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">The contributor list is temporarily unavailable. You can still open it on GitHub.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`${site.github}/graphs/contributors`} variant="secondary">Contributors on GitHub</ButtonLink>
        <ButtonLink href={site.contributions} variant="tertiary">Contribution reports</ButtonLink>
        <ButtonLink href="/monthly-updates" variant="tertiary">Monthly Updates</ButtonLink>
      </div>

      <PageHeader id="get-involved" title="Get Involved" className="mt-12" />
      <p className="text-foreground/90 mb-4">
        Physlib is a community project. There are many ways to contribute —
        whether you&apos;re a physicist, a Lean enthusiast, or both.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/get-involved">Ways to Contribute</ButtonLink>
        <ButtonLink href={site.zulip} variant="tertiary">
          Join the Zulip
        </ButtonLink>
      </div>

    </div>
  );
}
