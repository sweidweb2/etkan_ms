"use client";

import { useMemo, useState, useTransition, useActionState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { deleteGalleryImageAction } from "@/app/manager/gallery/actions";
import { Can } from "@/components/auth/can";
import { AddGalleryImageDialog } from "@/components/manager/gallery/add-gallery-image-dialog";
import { EditGalleryImageDialog } from "@/components/manager/gallery/edit-gallery-image-dialog";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteGalleryImageActionState,
  ManagerGalleryImageRow,
} from "@/types/manager-gallery-image";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  name: 36,
  url: 48,
} as const;

const initialDeleteState: DeleteGalleryImageActionState = {};

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

function matchesSearch(image: ManagerGalleryImageRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [image.name, image.direct_url].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function ManageGalleryPanel({
  initialImages,
}: {
  initialImages: ManagerGalleryImageRow[];
}) {
  const [images, setImages] = useState(initialImages);
  const [prevImages, setPrevImages] = useState(initialImages);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingImage, setEditingImage] =
    useState<ManagerGalleryImageRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerGalleryImageRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGalleryImageAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;

  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialImages !== prevImages) {
    setPrevImages(initialImages);
    setImages(initialImages);
  }

  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    if (deleteTarget) {
      const removedId = deleteTarget.id;
      setImages((current) => current.filter((row) => row.id !== removedId));
    }
    setDeleteTarget(null);
  });

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  const filteredImages = useMemo(() => {
    return images.filter((image) => matchesSearch(image, searchQuery));
  }, [images, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredImages.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rangeStart =
    filteredImages.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredImages.length
  );
  const paginatedImages = filteredImages.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handlePageSizeChange(value: string | null) {
    if (!value) {
      return;
    }
    const nextSize = Number(value) as (typeof PAGE_SIZE_OPTIONS)[number];
    setPageSize(nextSize);
    setCurrentPage(1);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Manage gallery
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Images shown on the public gallery page.
            </p>
          </div>
          <Can permission={PERMISSIONS.GALLERY_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add image
            </Button>
          </Can>
        </div>

        <AddGalleryImageDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onImageCreated={(image) => {
            setImages((current) => [image, ...current]);
            setCurrentPage(1);
          }}
        />

        <EditGalleryImageDialog
          open={editingImage !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingImage(null);
            }
          }}
          image={editingImage}
          onImageUpdated={(image) => {
            setImages((current) =>
              current.map((row) => (row.id === image.id ? image : row))
            );
            setEditingImage((current) =>
              current?.id === image.id ? image : current
            );
          }}
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
              <DialogTitle>Delete gallery image</DialogTitle>
              <DialogDescription>
                This will permanently remove &quot;{deleteTarget?.name}&quot;.
                This action cannot be undone.
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

        <div className="grid gap-4 sm:grid-cols-2">
          <UserStatCard
            label="Total images"
            value={images.length}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Matching search"
            value={filteredImages.length}
            accentClassName="border-l-violet-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Gallery images</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border-b px-4 pt-2 pb-3">
              <div className="relative max-w-md">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name or URL…"
                  className="pl-8"
                  aria-label="Search gallery images"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Direct URL</th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedImages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {images.length === 0
                          ? "No gallery images yet. Add one to get started."
                          : "No images match your search."}
                      </td>
                    </tr>
                  ) : (
                    paginatedImages.map((image) => (
                      <tr
                        key={image.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={image.name}
                            maxLength={COLUMN_LIMITS.name}
                          />
                        </td>
                        <td className="max-w-[20rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={image.direct_url}
                            maxLength={COLUMN_LIMITS.url}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(image.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Can permission={PERMISSIONS.GALLERY_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${image.name}`}
                                onClick={() => setEditingImage(image)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Can permission={PERMISSIONS.GALLERY_DELETE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${image.name}`}
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(image)}
                              >
                                <Trash2Icon />
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
                  Showing {rangeStart}–{rangeEnd} of {filteredImages.length}
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
