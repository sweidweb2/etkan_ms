"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { deleteBlogAction } from "@/app/manager/blogs/actions";
import { Can } from "@/components/auth/can";
import { AddBlogSheet } from "@/components/manager/blogs/add-blog-sheet";
import { AdvancedBlogJsonForm } from "@/components/manager/blogs/advanced-blog-json-form";
import { EditBlogSheet } from "@/components/manager/blogs/edit-blog-sheet";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { BLOG_STATUS_LABELS } from "@/lib/constants/manager-blog";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getBlogDetailRoute, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { prependUniqueById } from "@/lib/utils/prepend-unique-by-id";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteBlogActionState,
  ManagerBlogRow,
} from "@/types/manager-blog";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  title: 40,
  author: 24,
} as const;

const TABS = [
  { value: "records", label: "Records" },
  { value: "advanced", label: "Advanced create" },
] as const;

type BlogsTab = (typeof TABS)[number]["value"];

const initialDeleteState: DeleteBlogActionState = {};

const ROW_CLASS =
  "border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)]";

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
    return <span className={className}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("cursor-help", className)} tabIndex={0} />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{value}</TooltipContent>
    </Tooltip>
  );
}

type ManageBlogsPanelProps = {
  initialBlogs: ManagerBlogRow[];
};

export function ManageBlogsPanel({ initialBlogs }: ManageBlogsPanelProps) {
  const [blogs, setBlogs] = useState(initialBlogs);
  const [activeTab, setActiveTab] = useState<BlogsTab>("records");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<ManagerBlogRow | null>(null);
  const [deleteBlog, setDeleteBlog] = useState<ManagerBlogRow | null>(null);

  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeleteActionPending] = useActionState(
    deleteBlogAction,
    initialDeleteState
  );
  const isDeletePending = isDeleteActionPending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (open) => {
      if (!open) {
        setDeleteBlog(null);
      }
    }
  );

  useActionStateToast(deleteState, isDeletePending);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return blogs.filter((blog) => {
      if (statusFilter !== "all" && blog.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        blog.title.toLowerCase().includes(query) ||
        blog.author_name.toLowerCase().includes(query) ||
        blog.slug.toLowerCase().includes(query)
      );
    });
  }, [blogs, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const published = blogs.filter((blog) => blog.status === "published").length;
    const draft = blogs.filter((blog) => blog.status === "draft").length;
    const featured = blogs.filter((blog) => blog.is_featured).length;
    return {
      total: blogs.length,
      published,
      draft,
      featured,
    };
  }, [blogs]);

  function onBlogCreated(created: ManagerBlogRow) {
    setBlogs((prev) => {
      const next = prependUniqueById(prev, created);
      if (created.is_featured) {
        return next.map((blog) =>
          blog.id === created.id ? blog : { ...blog, is_featured: false }
        );
      }
      return next;
    });
    setCurrentPage(1);
  }

  function onBlogUpdated(updated: ManagerBlogRow) {
    setBlogs((prev) => {
      const next = prev.map((blog) =>
        blog.id === updated.id ? updated : blog
      );
      if (updated.is_featured) {
        return next.map((blog) =>
          blog.id === updated.id
            ? blog
            : { ...blog, is_featured: false }
        );
      }
      return next;
    });
  }

  function confirmDelete() {
    if (!deleteBlog) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deleteBlog.id);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.BLOGS} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon className="size-4" />
            Public pages
          </Button>
          {activeTab === "records" ? (
            <Can permission={PERMISSIONS.BLOGS_CREATE}>
              <Button type="button" onClick={() => setAddOpen(true)}>
                <PlusIcon className="size-4" />
                New blog
              </Button>
            </Can>
          ) : null}
        </div>

        <Can permission={PERMISSIONS.BLOGS_CREATE}>
          <div
            role="tablist"
            aria-label="Blogs views"
            className="inline-flex w-fit gap-1 rounded-md border bg-muted/40 p-1 sm:mx-auto"
          >
            {TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                size="sm"
                variant={activeTab === tab.value ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </Can>

        {activeTab === "advanced" ? (
          <Can permission={PERMISSIONS.BLOGS_CREATE}>
            <AdvancedBlogJsonForm
              onBlogCreated={(created) => {
                onBlogCreated(created);
                setActiveTab("records");
              }}
            />
          </Can>
        ) : (
          <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total"
            value={stats.total}
            accentClassName="border-l-primary"
          />
          <UserStatCard
            label="Published"
            value={stats.published}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Draft"
            value={stats.draft}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Featured"
            value={stats.featured}
            accentClassName="border-l-sky-500"
          />
        </div>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Blogs</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search title, author, slug…"
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (value) {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No blogs match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((blog) => (
                      <tr
                        key={blog.id}
                        className={cn(
                          ROW_CLASS,
                          blog.is_featured && "border-l-4 border-l-primary"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <TruncatedCell
                              value={blog.title}
                              maxLength={COLUMN_LIMITS.title}
                              className="font-medium"
                            />
                            <span className="text-xs text-muted-foreground">
                              /{blog.slug}
                              {blog.is_featured ? " · Featured" : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {BLOG_STATUS_LABELS[blog.status]}
                        </td>
                        <td className="px-4 py-3">
                          <TruncatedCell
                            value={blog.author_name}
                            maxLength={COLUMN_LIMITS.author}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(blog.updated_at), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {blog.status === "published" ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                render={
                                  <Link
                                    href={getBlogDetailRoute(blog.slug)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="View public post"
                                  />
                                }
                              >
                                <ExternalLinkIcon className="size-4" />
                              </Button>
                            ) : null}
                            <Can permission={PERMISSIONS.BLOGS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setEditBlog(blog)}
                                aria-label="Edit blog"
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                            </Can>
                            <Can permission={PERMISSIONS.BLOGS_DELETE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteBlog(blog)}
                                aria-label="Delete blog"
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

            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    setPageSize(
                      Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]
                    );
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <AddBlogSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onBlogCreated={onBlogCreated}
      />

      <EditBlogSheet
        open={Boolean(editBlog)}
        onOpenChange={(open) => {
          if (!open) {
            setEditBlog(null);
          }
        }}
        blog={editBlog}
        onBlogUpdated={onBlogUpdated}
      />

      <Dialog
        open={Boolean(deleteBlog)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent showCloseButton={!isDeletePending}>
          <DialogHeader>
            <DialogTitle>Delete blog?</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">
                {deleteBlog?.title}
              </span>
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
