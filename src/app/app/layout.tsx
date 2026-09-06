import { Header } from "@/components/Header";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { Rail, type RailGroup } from "@/components/Rail";
import { requireLocalUser } from "@/lib/auth";
import { newLeadCount } from "@/lib/leads";
import { listProjects } from "@/lib/projects";

const groupsFor = (newLeads: number): RailGroup[] => [
  {
    label: "Engage",
    items: [
      { href: "/app/leads", label: "Leads", icon: "radar", count: newLeads },
      { href: "/app/seo", label: "Reddit SEO", icon: "search", count: 0 },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/app/insights", label: "Insights", icon: "lightbulb" },
      { href: "/app/competitors", label: "Competitors", icon: "swords", count: 0 },
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLocalUser();
  const projects = await listProjects(user.id);
  const project = projects[0];
  const newLeads = project ? await newLeadCount(project.id) : 0;
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex flex-1">
        <Rail groups={groupsFor(newLeads)}>
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
