import { Header } from "@/components/Header";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { Rail, type RailGroup } from "@/components/Rail";
import { requireLocalUser } from "@/lib/auth";
import { listMentions } from "@/lib/competitors/read";
import { newLeadCount } from "@/lib/leads";
import { listProjects } from "@/lib/projects";
import { listOpportunities } from "@/lib/seo/read";

type RailCounts = { newLeads: number; rankingThreads: number; mentions: number };

const groupsFor = (counts: RailCounts): RailGroup[] => [
  {
    label: "Engage",
    items: [
      { href: "/app/leads", label: "Leads", icon: "radar", count: counts.newLeads },
      { href: "/app/seo", label: "Reddit SEO", icon: "search", count: counts.rankingThreads },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/app/insights", label: "Insights", icon: "lightbulb" },
      { href: "/app/competitors", label: "Competitors", icon: "swords", count: counts.mentions },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/app/product", label: "Product", icon: "box" },
      { href: "/app/usage", label: "Data usage", icon: "receipt" },
      { href: "/app/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const EMPTY_COUNTS: RailCounts = { newLeads: 0, rankingThreads: 0, mentions: 0 };

/**
 * What the rail's pills count for the project on screen: leads waiting, threads
 * Google ranks, and competitor mentions inside the mention window.
 */
async function countsFor(projectId: string): Promise<RailCounts> {
  const [newLeads, opportunities, mentions] = await Promise.all([
    newLeadCount(projectId),
    listOpportunities(projectId, {}),
    listMentions(projectId),
  ]);
  return {
    newLeads,
    rankingThreads: opportunities.length,
    mentions: mentions.length,
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser();
  const projects = await listProjects(user.id);
  const project = projects[0];
  const counts = project ? await countsFor(project.id) : EMPTY_COUNTS;
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex flex-1">
        <Rail groups={groupsFor(counts)}>
          <ProjectSwitcher
            projects={projects.map((one) => ({ id: one.id, name: one.name, url: one.url }))}
            defaultId={projects[0]?.id ?? null}
          />
        </Rail>
        <main className="flex-1" style={{ padding: "var(--page-gutter)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
