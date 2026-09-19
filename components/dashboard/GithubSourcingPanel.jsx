"use client";

// Real candidate search against GitHub's public API — two modes:
//   Profile — search user profiles by keyword/language/location
//   Project — describe the work you need evidence of; searches repositories
//             for it and surfaces whoever owns a matching one, scored and
//             ready to shortlist (see app/api/sourcing/github/project/route.js)
// Every result in both modes is a real GitHub account. "Add as candidate"
// drops them straight into the Candidates dashboard.

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Meter,
  MockNote,
  Pill,
  SectionTitle,
  Textarea,
} from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icons";
import { useStore } from "@/lib/store";
import { normalizeGithubCandidate } from "@/lib/candidates";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "profile", label: "Search by profile" },
  { id: "project", label: "Search by project" },
];

export function GithubSourcingPanel() {
  const { session, notify, addCandidate } = useStore();
  const companyId = session?.company?.id || "demo-company";
  const [mode, setMode] = useState("profile");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-[10px] border border-line bg-canvas-deep/60 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors",
              mode === m.id ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-muted hover:text-ink-soft"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "profile" ? (
        <ProfileSearch companyId={companyId} notify={notify} addCandidate={addCandidate} />
      ) : (
        <ProjectSearch companyId={companyId} notify={notify} addCandidate={addCandidate} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ profile mode */

function ProfileSearch({ companyId, notify, addCandidate }) {
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("");
  const [location, setLocation] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | searching | done
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [connected, setConnected] = useState(false);
  const [addedLogins, setAddedLogins] = useState(new Set());

  async function search() {
    if (!keyword.trim() && !language.trim() && !location.trim()) {
      setError("Enter a keyword, language, or location to search for.");
      return;
    }
    setPhase("searching");
    setError("");

    try {
      const res = await fetch("/api/sourcing/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, keyword, language, location }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Search failed (HTTP ${res.status}).`);
        setPhase("idle");
        return;
      }
      setResults(json.results);
      setConnected(json.connected);
      setPhase("done");
    } catch (e) {
      setError(e.message || "Network error while searching GitHub.");
      setPhase("idle");
    }
  }

  function addAsCandidate(profile) {
    addCandidate(normalizeGithubCandidate(profile));
    setAddedLogins((prev) => new Set(prev).add(profile.login));
    notify(`${profile.name} added to your dashboard`);
  }

  return (
    <>
      <Card className="p-5">
        <SectionTitle eyebrow="Real search" title="Find candidates on GitHub" />
        <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
          Queries GitHub's public directory directly — every result below is a real account, not a
          fictional one.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Keyword" htmlFor="gh-keyword" hint="· name, bio, or company">
            <Input
              id="gh-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. backend"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </Field>
          <Field label="Language" htmlFor="gh-language" hint="· optional">
            <Input
              id="gh-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. Go"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </Field>
          <Field label="Location" htmlFor="gh-location" hint="· optional">
            <Input
              id="gh-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bengaluru"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </Field>
        </div>

        <Button variant="accent" size="sm" className="mt-4" onClick={search} disabled={phase === "searching"}>
          {phase === "searching" ? "Searching…" : "Search GitHub"}
          {phase !== "searching" && <Icon.Search size={15} />}
        </Button>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
            <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[12.5px] leading-relaxed text-danger">{error}</p>
          </div>
        )}
      </Card>

      {phase === "done" && (
        <>
          {!connected && (
            <div className="flex items-start gap-2.5 rounded-card border border-warn/25 bg-warn-soft px-4 py-3">
              <Icon.Warning size={15} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Searching unauthenticated — GitHub allows 10 searches/min this way. Connect a token in{" "}
                <a href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">
                  Settings → API Connections
                </a>{" "}
                for 30/min and higher profile-lookup limits.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((p) => {
              const added = addedLogins.has(p.login);
              return (
                <Card key={p.login} className="p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-full border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                        <span className="text-[12px] text-faint">@{p.login}</span>
                      </div>
                      {p.bio && <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{p.bio}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                        {p.company && <span>{p.company}</span>}
                        {p.location && <span>{p.location}</span>}
                        <span>{p.publicRepos} repos</span>
                        <span>{p.followers} followers</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button href={p.htmlUrl} target="_blank" rel="noreferrer" variant="ghost" size="xs">
                      <Icon.Github size={12} />
                      View profile
                    </Button>
                    <Button
                      variant={added ? "secondary" : "primary"}
                      size="xs"
                      className="ml-auto"
                      onClick={() => addAsCandidate(p)}
                      disabled={added}
                    >
                      {added ? "Added" : "Add as candidate"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {!results.length && (
            <Card className="flex flex-col items-center gap-2 py-14 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
                <Icon.Github size={18} />
              </span>
              <p className="text-[13.5px] font-medium text-ink">No matches</p>
              <p className="max-w-xs text-[12.5px] text-muted">Try a broader keyword or drop a filter.</p>
            </Card>
          )}
        </>
      )}

      <MockNote>
        Real GitHub data — added candidates carry a name, bio, and profile link only. Skills and experience
        stay empty until they submit a résumé or a shortlist run scores their repos.
      </MockNote>
    </>
  );
}

/* ------------------------------------------------------------ project mode */

function ProjectSearch({ companyId, notify, addCandidate }) {
  const [requirements, setRequirements] = useState("");
  const [language, setLanguage] = useState("");
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState("idle"); // idle | searching | done
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [mode, setMode] = useState(null); // provider id or "heuristic"
  const [connected, setConnected] = useState(false);
  const [addedLogins, setAddedLogins] = useState(new Set());

  const boundedCount = Math.max(1, Math.min(count || 1, results.length || 1));
  const shortlistedLogins = useMemo(
    () => new Set(results.slice(0, boundedCount).map((r) => r.login)),
    [results, boundedCount]
  );

  async function search() {
    if (!requirements.trim()) {
      setError("Describe the project or work you need evidence of.");
      return;
    }
    setPhase("searching");
    setError("");

    try {
      const res = await fetch("/api/sourcing/github/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, requirements, language }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Search failed (HTTP ${res.status}).`);
        setPhase("idle");
        return;
      }
      setResults(json.candidates);
      setKeywords(json.keywords);
      setMode(json.mode);
      setConnected(json.connected);
      setAddedLogins(new Set());
      setPhase("done");
    } catch (e) {
      setError(e.message || "Network error while searching GitHub.");
      setPhase("idle");
    }
  }

  function addAsCandidate(profile) {
    addCandidate(normalizeGithubCandidate(profile, { matchedRepos: profile.matchedRepos, requirements, score: profile.score }));
    setAddedLogins((prev) => new Set(prev).add(profile.login));
    notify(`${profile.name} added to your dashboard`);
  }

  function addShortlisted() {
    const toAdd = results.filter((r) => shortlistedLogins.has(r.login) && !addedLogins.has(r.login));
    for (const profile of toAdd) {
      addCandidate(normalizeGithubCandidate(profile, { matchedRepos: profile.matchedRepos, requirements, score: profile.score }));
    }
    setAddedLogins((prev) => new Set([...prev, ...toAdd.map((r) => r.login)]));
    notify(`${toAdd.length} candidate${toAdd.length === 1 ? "" : "s"} added to your dashboard`);
  }

  return (
    <>
      <Card className="p-5">
        <SectionTitle eyebrow="Real search · evidence-based" title="Find candidates by project requirement" />
        <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
          Describe the work — searches GitHub repositories for it directly and ranks whoever owns a
          matching one, so the shortlist is backed by something they actually built.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Project requirements" htmlFor="gh-requirements" hint="· be specific">
            <Textarea
              id="gh-requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              placeholder="e.g. Built a real-time chat system with websockets and Redis pub/sub, handling reconnects gracefully."
            />
          </Field>
          <div className="space-y-3">
            <Field label="Language" htmlFor="gh-proj-language" hint="· optional">
              <Input
                id="gh-proj-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="auto-detected"
              />
            </Field>
            <Field label="Shortlist top" htmlFor="gh-count" hint={results.length ? `of ${results.length}` : ""}>
              <Input
                id="gh-count"
                type="number"
                min={1}
                max={results.length || 1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <Button variant="accent" size="sm" className="mt-4" onClick={search} disabled={phase === "searching"}>
          {phase === "searching" ? "Searching & scoring…" : "Search & score"}
          {phase !== "searching" && <Icon.Sparkle size={15} />}
        </Button>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-danger/25 bg-danger-soft px-3 py-2.5">
            <Icon.Warning size={14} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[12.5px] leading-relaxed text-danger">{error}</p>
          </div>
        )}
      </Card>

      {phase === "done" && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
            {mode === "heuristic" ? (
              <span className="flex items-center gap-1.5">
                <Icon.Warning size={13} className="text-warn" />
                <span className="text-warn font-medium">Heuristic keywords</span> — no model connected, so
                terms were pulled from your text directly.
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon.Sparkle size={13} className="text-primary" />
                Keywords extracted by <span className="font-medium text-ink-soft">{mode}</span>
              </span>
            )}
            <span className="text-faint">·</span>
            <span>Searched: {keywords.map((k) => `"${k}"`).join(", ")}{language && ` · language:${language}`}</span>
          </div>

          {!connected && (
            <div className="flex items-start gap-2.5 rounded-card border border-warn/25 bg-warn-soft px-4 py-3">
              <Icon.Warning size={15} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Searching unauthenticated — GitHub allows 10 searches/min this way. Connect a token in{" "}
                <a href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">
                  Settings → API Connections
                </a>{" "}
                for a higher limit.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted">
                <span className="font-semibold text-ink">{results.length}</span> candidate
                {results.length === 1 ? "" : "s"} found, top {boundedCount} shortlisted
              </span>
              <Button variant="primary" size="sm" onClick={addShortlisted}>
                <Icon.Users size={14} />
                Add top {boundedCount} as candidates
              </Button>
            </div>
          )}

          <ul className="divide-y divide-line-soft">
            {results.map((p) => {
              const added = addedLogins.has(p.login);
              const shortlisted = shortlistedLogins.has(p.login);
              return (
                <li key={p.login} className={cn("py-4", !shortlisted && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-full border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                        <span className="text-[12px] text-faint">@{p.login}</span>
                        {shortlisted ? (
                          <Badge tone="success">Shortlisted</Badge>
                        ) : (
                          <Badge tone="neutral">Not selected</Badge>
                        )}
                      </div>
                      {p.bio && <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">{p.bio}</p>}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.matchedRepos.map((repo) => (
                          <span key={repo.name} title={repo.description}>
                            <Pill className="text-[11px]">
                              {repo.name}
                              {repo.stars > 0 && ` · ★${repo.stars}`}
                            </Pill>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">{p.score}</span>
                      <span className="w-16">
                        <Meter value={p.score} />
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 pl-[52px]">
                    <Button href={p.htmlUrl} target="_blank" rel="noreferrer" variant="ghost" size="xs">
                      <Icon.Github size={12} />
                      View profile
                    </Button>
                    <Button
                      variant={added ? "secondary" : "primary"}
                      size="xs"
                      className="ml-auto"
                      onClick={() => addAsCandidate(p)}
                      disabled={added}
                    >
                      {added ? "Added" : "Add as candidate"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {!results.length && (
            <Card className="flex flex-col items-center gap-2 py-14 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-faint">
                <Icon.Github size={18} />
              </span>
              <p className="text-[13.5px] font-medium text-ink">No matching repositories</p>
              <p className="max-w-xs text-[12.5px] text-muted">
                Try describing the technologies more directly, or drop the language filter.
              </p>
            </Card>
          )}
        </>
      )}

      <MockNote>
        Real GitHub data — candidates added here carry the matched repositories as their listed projects,
        so the evidence stays attached, not just the score.
      </MockNote>
    </>
  );
}
