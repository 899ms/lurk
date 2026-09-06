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
      { href: "/app/leads", label: "Leads", count: newLeads },
      { href: "/app/seo", label: "Reddit SEO", count: 0 },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/app/insights", label: "Insights" },
      { href: "/app/competitors", label: "Competitors", count: 0 },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/app/product", label: "Product" },
      { href: "/app/usage", label: "Data usage" },
      { href: "/app/settings", label: "Settings" },
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
            projects={projects.map((project) => ({ id: project.id, name: project.name }))}
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
