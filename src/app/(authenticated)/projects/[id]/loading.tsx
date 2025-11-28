import { ProjectDetailPageSkeleton } from "@/components/projects/ProjectsPageSkeleton";

/**
 * Loading state for project detail page
 * Only renders content skeleton; shell persists in RootLayout
 */
export default function ProjectDetailLoading() {
  return <ProjectDetailPageSkeleton />;
}
