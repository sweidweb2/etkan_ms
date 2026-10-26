"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  LayoutGridIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import {
  deleteGalleryImageAction,
  loadGalleryImagesPageAction,
} from "@/app/manager/gallery/actions";
import { Can } from "@/components/auth/can";
import { AddGalleryImageDialog } from "@/components/manager/gallery/add-gallery-image-dialog";
import { EditGalleryImageDialog } from "@/components/manager/gallery/edit-gallery-image-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { GALLERY_MANAGER_PAGE_SIZE_OPTIONS } from "@/lib/constants/manager-gallery";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  DeleteGalleryImageActionState,
  ManagerGalleryImageRow,
  ManagerGalleryListData,
} from "@/types/manager-gallery-image";

const PAGE_SIZE_OPTIONS = GALLERY_MANAGER_PAGE_SIZE_OPTIONS;
const COLUMN_LIMITS = {
  name: 36,
  url: 48,
} as const;

const VIEW_MODES = [
  { value: "table", label: "Table", icon: ListIcon },
  { value: "grid", label: "Grid", icon: LayoutGridIcon },
] as const;

type GalleryViewMode = (typeof VIEW_MODES)[number]["value"];

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

function GalleryThumb({
  name,
  url,
  className,
}: {
  name: string;
  url: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small manager preview
    <img
      src={url}
      alt={name}
      className={cn("bg-muted object-cover", className)}
      loading="lazy"
    />
  );
}

function ImageActions({
  image,
  onEdit,
  onDelete,
}: {
  image: ManagerGalleryImageRow;
  onEdit: (image: ManagerGalleryImageRow) => void;
  onDelete: (image: ManagerGalleryImageRow) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <CopyTextButton
        value={image.url}
        label={`Copy URL for ${image.name}`}
        successMessage="Image URL copied."
      />
      <Can permission={PERMISSIONS.GALLERY_UPDATE}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${image.name}`}
          onClick={() => onEdit(image)}
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
          onClick={() => onDelete(image)}
        >
          <Trash2Icon />
        </Button>
      </Can>
    </div>
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

export function ManageGalleryPanel({
  initialData,
}: {
  initialData: ManagerGalleryListData;
}) {
  const [list, setList] = useState(initialData);
  const [viewMode, setViewMode] = useState<GalleryViewMode>("table");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingImage, setEditingImage] =
    useState<ManagerGalleryImageRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerGalleryImageRow | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    initialData.pageSize as (typeof PAGE_SIZE_OPTIONS)[number]
  );
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const [refreshToken, setRefreshToken] = useState(0);
  const requestKey = `${currentPage}|${pageSize}|${appliedSearch}|${refreshToken}`;
  const loadedKeyRef = useRef(requestKey);
  const appliedSearchRef = useRef(appliedSearch);

  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGalleryImageAction,
    initialDeleteState
  );

  useActionStateToast(deleteState, isDeletePending);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (appliedSearchRef.current === nextSearch) {
        return;
      }
      appliedSearchRef.current = nextSearch;
      setAppliedSearch(nextSearch);
      setCurrentPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (loadedKeyRef.current === requestKey) {
      return;
    }

    let cancelled = false;

    void loadGalleryImagesPageAction({
      page: currentPage,
      pageSize,
      search: appliedSearch,
    }).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      loadedKeyRef.current = `${result.data.page}|${result.data.pageSize}|${appliedSearch}|${refreshToken}`;
      setList(result.data);
      if (result.data.page !== currentPage) {
        setCurrentPage(result.data.page);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appliedSearch, currentPage, pageSize, refreshToken, requestKey]);

  useActionStateSuccess(deleteState, isDeletePending, () => {
    setDeleteTarget(null);
    setRefreshToken((token) => token + 1);
  });

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeletePending,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  const images = list.images;
  const totalPages = Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  const safeCurrentPage = list.page;
  const rangeStart =
    list.totalCount === 0 ? 0 : (safeCurrentPage - 1) * list.pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * list.pageSize,
    list.totalCount
  );
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  const isCatalogEmpty = list.catalogCount === 0;

  function handleSearchChange(value: string) {
    setSearchInput(value);
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

    deleteAction(formData);
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
          onImageCreated={() => {
            appliedSearchRef.current = "";
            setSearchInput("");
            setAppliedSearch("");
            setCurrentPage(1);
            setRefreshToken((token) => token + 1);
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
            setEditingImage((current) =>
              current?.id === image.id ? image : current
            );
            setRefreshToken((token) => token + 1);
          }}
        />

        <Dialog
          open={deleteTarget !== null}
          onOpenChange={handleDeleteOpenChange}
        >
          <DialogContent
            className="sm:max-w-md"
            showCloseButton={!isDeletePending}
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
                disabled={isDeletePending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeletePending}
              >
                {isDeletePending ? (
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
            value={list.catalogCount}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Matching search"
            value={list.totalCount}
            accentClassName="border-l-violet-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3">
            <CardTitle>Gallery images</CardTitle>
            <div
              role="group"
              aria-label="Gallery view"
              className="inline-flex gap-1 rounded-md border bg-muted/40 p-1"
            >
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const selected = viewMode === mode.value;
                return (
                  <Button
                    key={mode.value}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "ghost"}
                    aria-pressed={selected}
                    onClick={() => setViewMode(mode.value)}
                  >
                    <Icon data-icon="inline-start" />
                    {mode.label}
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border-b px-4 pt-2 pb-3">
              <div className="relative max-w-md">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name…"
                  className="pl-8"
                  aria-label="Search gallery images"
                />
              </div>
            </div>

            {images.length === 0 ? (
              <EmptyState
                size="sm"
                className="m-4"
                icon={isCatalogEmpty ? ImageIcon : SearchIcon}
                title={
                  isCatalogEmpty
                    ? "No gallery images yet"
                    : "No images match your search"
                }
                description={
                  isCatalogEmpty
                    ? "Add one to get started."
                    : "Try a different search term."
                }
              />
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Preview</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">URL</th>
                      <th className="px-4 py-3 font-medium">Added</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((image) => (
                      <tr
                        key={image.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <GalleryThumb
                            name={image.name}
                            url={image.url}
                            className="size-12 rounded-md"
                          />
                        </td>
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={image.name}
                            maxLength={COLUMN_LIMITS.name}
                          />
                        </td>
                        <td className="max-w-[20rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={image.url}
                            maxLength={COLUMN_LIMITS.url}
                            className="min-w-0"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(image.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <ImageActions
                            image={image}
                            onEdit={setEditingImage}
                            onDelete={setDeleteTarget}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.map((image) => (
                  <li
                    key={image.id}
                    className="overflow-hidden rounded-lg border bg-card"
                  >
                    <GalleryThumb
                      name={image.name}
                      url={image.url}
                      className="aspect-[4/3] w-full"
                    />
                    <div className="flex flex-col gap-2 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {image.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(image.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <ImageActions
                        image={image}
                        onEdit={setEditingImage}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {list.totalCount}
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
