"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, useActionState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { deletePublicProjectAction } from "@/app/manager/projects/actions";
import { Can } from "@/components/auth/can";
import { AddPublicProjectDialog } from "@/components/manager/projects/add-public-project-dialog";
import { EditPublicProjectDialog } from "@/components/manager/projects/edit-public-project-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { PUBLIC_PROJECT_CLASSIFICATION_LABELS } from "@/lib/constants/manager-public-project";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerProjectDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeletePublicProjectActionState,
  ManagerPublicProjectRow,
} from "@/types/manager-public-project";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  title: 36,
} as const;

const PROJECT_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const initialDeleteState: DeletePublicProjectActionState = {};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-all">{value}</TooltipContent>
    </Tooltip>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function matchesSearch(project: ManagerPublicProjectRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    project.title,
    PUBLIC_PROJECT_CLASSIFICATION_LABELS[project.classification],
    project.category,
    project.image_url,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function ProjectDetailsLink({ project }: { project: ManagerPublicProjectRow }) {
  return (
    <Link
      href={getManagerProjectDetailRoute(project.id)}
      aria-label={`View ${project.title}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
    >
      <EyeIcon className="size-4" />
    </Link>
  );
}

export function ManageProjectsPanel({
  initialProjects,
}: {
  initialProjects: ManagerPublicProjectRow[];
}) {
  const router = useRouter();
  const projects = initialProjects;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ManagerPublicProjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerPublicProjectRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deletePublicProjectAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;

  useActionStateToast(deleteState, isDeleteActionPending);

  const handleProjectsChanged = () => {
    router.refresh();
  };

  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    setDeleteTarget(null);
    handleProjectsChanged();
  });

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  const stats = useMemo(
    () => ({
      total: projects.length,
      students: projects.filter(
        (project) => project.classification === "students"
      ).length,
      teachers: projects.filter(
        (project) => project.classification === "teachers"
      ).length,
      etkan: projects.filter((project) => project.classification === "etkan")
        .length,
    }),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => matchesSearch(project, searchQuery));
  }, [projects, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProjects = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredProjects.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredProjects.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }
    const nextSize = Number(value) as (typeof PAGE_SIZE_OPTIONS)[number];
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  const openProjectDetails = (project: ManagerPublicProjectRow) => {
    router.push(getManagerProjectDetailRoute(project.id));
  };

  const handleProjectRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    project: ManagerPublicProjectRow
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProjectDetails(project);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(() => {
      deleteAction(formData);
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Manage projects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Project cards shown on the public projects page.
            </p>
          </div>
          <Can permission={PERMISSIONS.PROJECTS_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create
            </Button>
          </Can>
        </div>

        <AddPublicProjectDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onProjectCreated={() => {
            setCurrentPage(1);
            handleProjectsChanged();
          }}
        />

        <EditPublicProjectDialog
          open={editingProject !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProject(null);
            }
          }}
          project={editingProject}
          onProjectUpdated={handleProjectsChanged}
        />

        <Dialog
          open={deleteTarget !== null}
          onOpenChange={handleDeleteOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeleteActionPending}
          >
            <DialogHeader>
              <DialogTitle>Delete project</DialogTitle>
              <DialogDescription>
                This will permanently delete &quot;{deleteTarget?.title}
                &quot; and its image. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeleteOpenChange(false)}
                disabled={isDeleteActionPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleteActionPending}
              >
                {isDeleteActionPending ? (
                  <>
                    <InlineSpinner />
                    Deleting
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Students"
            value={stats.students}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Teachers"
            value={stats.teachers}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Etkan"
            value={stats.etkan}
            accentClassName="border-l-emerald-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border-b px-4 pt-2 pb-3">
              <div className="relative max-w-md">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search title, classification, or category…"
                  className="pl-8"
                  aria-label="Search projects"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Classification</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {projects.length === 0
                          ? "No projects yet. Add one to get started."
                          : "No projects match your search."}
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((project) => (
                      <tr
                        key={project.id}
                        className={PROJECT_ROW_CLASS}
                        tabIndex={0}
                        role="link"
                        aria-label={`View details for ${project.title}`}
                        onClick={() => openProjectDetails(project)}
                        onKeyDown={(event) =>
                          handleProjectRowKeyDown(event, project)
                        }
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={project.title}
                            maxLength={COLUMN_LIMITS.title}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {
                            PUBLIC_PROJECT_CLASSIFICATION_LABELS[
                              project.classification
                            ]
                          }
                        </td>
                        <td className="px-4 py-3">
                          <TruncatedCell
                            value={project.category}
                            maxLength={COLUMN_LIMITS.title}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(project.updated_at), "MMM d, yyyy")}
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-center gap-1">
                            <ProjectDetailsLink project={project} />
                            <Can permission={PERMISSIONS.PROJECTS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                                aria-label={`Edit ${project.title}`}
                                onClick={() => setEditingProject(project)}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                            </Can>
                            <Can permission={PERMISSIONS.PROJECTS_DELETE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${project.title}`}
                                onClick={() => setDeleteTarget(project)}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredProjects.length}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16"
                      aria-label="Rows per page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </Button>

                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={page === safeCurrentPage ? "default" : "outline"}
                      size="icon-sm"
                      className="min-w-7"
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
                    >
                      {page}
                    </Button>
                  )
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
