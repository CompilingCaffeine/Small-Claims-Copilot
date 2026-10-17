// Hand-picked official California Courts self-help pages. Never AI-generated.
// Re-check each URL and update lastChecked when it's verified again.
import type { FollowUpTopic, OfficialLink } from "./schemas.ts";

const LAST_CHECKED = "2026-10-17";

export const OFFICIAL_LINKS: Record<Exclude<FollowUpTopic, "none">, OfficialLink> = {
  where_to_file: {
    title: "Before you start a small claims case (see “Where they are”), California Courts Self-Help Guide",
    url: "https://selfhelp.courts.ca.gov/small-claims/before-you-start",
    lastChecked: LAST_CHECKED,
  },
  serving: {
    title: "Serve your small claims forms, California Courts Self-Help Guide",
    url: "https://selfhelp.courts.ca.gov/small-claims/start-case/serve",
    lastChecked: LAST_CHECKED,
  },
  amount_limits: {
    title: "Small claims in California, California Courts Self-Help Guide",
    url: "https://selfhelp.courts.ca.gov/small-claims-california",
    lastChecked: LAST_CHECKED,
  },
  evidence_prep: {
    title: "Before you start a small claims case (see “You have proof”), California Courts Self-Help Guide",
    url: "https://selfhelp.courts.ca.gov/small-claims/before-you-start",
    lastChecked: LAST_CHECKED,
  },
};

export function linkFor(topic: FollowUpTopic): OfficialLink | undefined {
  return topic === "none" ? undefined : OFFICIAL_LINKS[topic];
}
