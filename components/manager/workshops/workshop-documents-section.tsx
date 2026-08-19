"use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { deleteWorkshopDocumentAction } from "@/app/manager/workshops/actions";
import { Can } from "@/components/auth/can";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { RenameWorkshopDocumentDialog } from "@/components/manager/workshops/rename-workshop-document-dialog";
import { UploadWorkshopDocumentDialog } from "@/components/manager/workshops/upload-workshop-document-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import type {
  DeleteWorkshopDocumentActionState,
  ManagerWorkshopDocumentRow,
} from "@/types/manager-workshop";

const initialDeleteState: DeleteWorkshopDocumentActionState = {};

type WorkshopDocumentsSectionProps = {
  workshopId: string;
  documents: ManagerWorkshopDocumentRow[];
  mutationsLocked?: boolean;
};

function formatFileSize(bytes: number | null) {
  if (bytes == null) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkshopDocumentsSection({
  workshopId,
  documents: initialDocuments,
  mutationsLocked = false,
}: WorkshopDocumentsSectionProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [prevDocuments, setPrevDocuments] = useState(initialDocuments);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [renamingDocument, setRenamingDocument] =
    useState<ManagerWorkshopDocumentRow | null>(null);
  const [deletingDocument, setDeletingDocument] =
    useState<ManagerWorkshopDocumentRow | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteWorkshopDocumentAction,
    initialDeleteState
  );
  const isDeleteActionPending = isDeletePending || isTransitionPending;
  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (open) => {
      if (!open) {
        setDeletingDocument(null);
      }
    }
  );

  if (initialDocuments !== prevDocuments) {
    setPrevDocuments(initialDocuments);
    setDocuments(initialDocuments);
  }

  useActionStateToast(deleteState, isDeleteActionPending);
  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    if (deletingDocument) {
      setDocuments((current) =>
        current.filter((document) => document.id !== deletingDocument.id)
      );
    }
    setDeletingDocument(null);
  });

  function handleConfirmDelete() {
    if (!deletingDocument) {
      return;
    }
    const formData = new FormData();
    formData.set("id", deletingDocument.id);
    formData.set("workshop_id", workshopId);
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <>
      <UploadWorkshopDocumentDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        workshopId={workshopId}
        onUploaded={(document) => {
          setDocuments((current) =>
            current.some((row) => row.id === document.id)
              ? current.map((row) => (row.id === document.id ? document : row))
              : [...current, document]
          );
        }}
      />

      <RenameWorkshopDocumentDialog
        open={Boolean(renamingDocument)}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingDocument(null);
          }
        }}
        document={renamingDocument}
        onRenamed={(document) => {
          setDocuments((current) =>
            current.map((row) => (row.id === document.id ? document : row))
          );
          setRenamingDocument((current) =>
            current?.id === document.id ? document : current
          );
        }}
      />

      <Dialog
        open={Boolean(deletingDocument)}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleteActionPending}
        >
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              {deletingDocument?.name?.trim()
                ? deletingDocument.name
                : "this document"}{" "}
              from storage? This cannot be undone.
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
              {isDeleteActionPending ? <InlineSpinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClassTabCollapsibleSection
        title="Documents"
        storageKey={`workshop-details-documents-v2:${workshopId}`}
        defaultOpen
        action={
          mutationsLocked ? undefined : (
            <Can permission={PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE}>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsUploadOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Upload
              </Button>
            </Can>
          )
        }
      >
        <div className="px-3 py-4 sm:px-4">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Size</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Uploaded</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-3 pr-3 align-top font-medium text-foreground">
                        {document.public_url ? (
                          <a
                            href={document.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
                          >
                            {document.name}
                            <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          </a>
                        ) : (
                          document.name
                        )}
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {formatFileSize(document.file_size)}
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {document.mime_type?.trim()
                          ? document.mime_type
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 align-top text-muted-foreground">
                        {format(
                          new Date(document.created_at),
                          "MMM d, yyyy"
                        )}
                      </td>
                      <td className="py-3 align-top">
                        {!mutationsLocked ? (
                          <div className="flex items-center justify-end gap-1">
                            <Can permission={PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Rename ${document.name}`}
                                onClick={() => setRenamingDocument(document)}
                              >
                                <PencilIcon />
                              </Button>
                            </Can>
                            <Can permission={PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${document.name}`}
                                onClick={() => setDeletingDocument(document)}
                              >
                                <Trash2Icon />
                              </Button>
                            </Can>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
