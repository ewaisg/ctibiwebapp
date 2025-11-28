import { ProjectsPageSkeleton } from "@/components/projects/ProjectsPageSkeleton";

/**
 * Loading state for projects page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function ProjectsLoading() {
  return <ProjectsPageSkeleton />;
}
