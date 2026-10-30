import { Card, CardDescription, CardHeader } from "@/components/ui/card";

export function ProjectsHome() {
  return (
    <section aria-labelledby="projects-home-heading">
      <Card>
        <CardHeader>
          <h2 id="projects-home-heading" className="text-xl font-semibold tracking-tight">
            Select a project
          </h2>
          <CardDescription>
            Choose a project from the sidebar, or create one there.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
