"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import {
  removeTempRegistrationDocumentAction,
  tempUploadRegistrationDocumentAction,
} from "@/app/(public)/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import {
  REGISTRATION_DOCUMENT_ACCEPT,
  REGISTRATION_DOCUMENT_MAX_FILES,
  REGISTRATION_ID_DOCUMENT_TYPE_LABELS,
  REGISTRATION_ID_DOCUMENT_TYPE_VALUES,
} from "@/lib/constants/public-registration";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { showErrorToast } from "@/lib/toast";

export type RegistrationUploadedDocument = {
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
};

type PendingUpload = {
  localId: string;
  fileName: string;
};

type RegistrationDocumentsStepProps = {
  uploadSessionId: string;
  idDocumentType: string;
  documents: RegistrationUploadedDocument[];
  disabled?: boolean;
  errors?: {
    id_document_type?: string;
    documents?: string;
  };
  onIdDocumentTypeChange: (value: string) => void;
  onDocumentsChange: (documents: RegistrationUploadedDocument[]) => void;
  onAppendDocuments: (documents: RegistrationUploadedDocument[]) => void;
  RegLabel: (props: {
    htmlFor?: string;
    children: React.ReactNode;
    required?: boolean;
  }) => React.ReactNode;
  FieldError: (props: { message?: string }) => React.ReactNode;
};

function PendingUploadRow({
  fileName,
  uploadingLabel,
}: {
  fileName: string;
  uploadingLabel: string;
}) {
  const progress = useSimulatedProgressPercent(true);

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">{fileName}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {uploadingLabel}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={uploadingLabel}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </li>
  );
}

export function RegistrationDocumentsStep({
  uploadSessionId,
  idDocumentType,
  documents,
  disabled = false,
  errors,
  onIdDocumentTypeChange,
  onDocumentsChange,
  onAppendDocuments,
  RegLabel,
  FieldError,
}: RegistrationDocumentsStepProps) {
  const { t } = usePublicI18n();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploadPending, startUploadTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();
  const busy = disabled || isUploadPending || isRemovePending;
  const remainingSlots =
    REGISTRATION_DOCUMENT_MAX_FILES - documents.length - pendingUploads.length;

  useEffect(() => {
    if (!fileInputRef.current) return;
    if (pendingUploads.length === 0) {
      fileInputRef.current.value = "";
    }
  }, [pendingUploads.length]);

  function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    const slots = Math.max(0, remainingSlots);
    const toUpload = list.slice(0, slots);
    if (toUpload.length === 0) return;

    const localEntries = toUpload.map((file) => ({
      localId: crypto.randomUUID(),
      fileName: file.name,
      file,
    }));

    setPendingUploads((current) => [
      ...current,
      ...localEntries.map(({ localId, fileName }) => ({ localId, fileName })),
    ]);

    startUploadTransition(async () => {
      const uploaded: RegistrationUploadedDocument[] = [];

      for (const entry of localEntries) {
        const formData = new FormData();
        formData.set("upload_session_id", uploadSessionId);
        formData.set("file", entry.file);

        const result = await tempUploadRegistrationDocumentAction(formData);

        setPendingUploads((current) =>
          current.filter((item) => item.localId !== entry.localId)
        );

        if (!result.success || !result.document) {
          showErrorToast(
            result.error ?? t("registration.documents.uploadError")
          );
          continue;
        }

        uploaded.push(result.document);
      }

      if (uploaded.length > 0) {
        onAppendDocuments(uploaded);
      }
    });
  }

  function removeDocument(storagePath: string) {
    startRemoveTransition(async () => {
      const formData = new FormData();
      formData.set("upload_session_id", uploadSessionId);
      formData.set("storage_path", storagePath);

      const result = await removeTempRegistrationDocumentAction(formData);
      if (!result.success) {
        showErrorToast(result.error ?? t("registration.documents.uploadError"));
        return;
      }

      onDocumentsChange(
        documents.filter((doc) => doc.storage_path !== storagePath)
      );
    });
  }

  return (
    <>
      <div>
        <RegLabel required>{t("registration.field.idDocumentType")}</RegLabel>
        <Select
          value={idDocumentType || null}
          onValueChange={(value) => onIdDocumentTypeChange(value ?? "")}
          disabled={busy}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("registration.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_ID_DOCUMENT_TYPE_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {REGISTRATION_ID_DOCUMENT_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors?.id_document_type} />
      </div>

      <div>
        <RegLabel htmlFor={inputId} required>
          {t("registration.field.documents")}
        </RegLabel>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("registration.documents.help")}
        </p>
        <Input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={REGISTRATION_DOCUMENT_ACCEPT}
          multiple
          disabled={busy || remainingSlots <= 0}
          onChange={(event) => {
            const files = event.target.files;
            if (files) uploadFiles(files);
          }}
        />
        <FieldError message={errors?.documents} />
      </div>

      {documents.length > 0 || pendingUploads.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.storage_path}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.max(1, Math.round(doc.file_size / 1024))} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("registration.documents.remove")}
                disabled={busy}
                onClick={() => removeDocument(doc.storage_path)}
              >
                <XIcon className="size-4" />
              </Button>
            </li>
          ))}
          {pendingUploads.map((item) => (
            <PendingUploadRow
              key={item.localId}
              fileName={item.fileName}
              uploadingLabel={t("registration.documents.uploading")}
            />
          ))}
        </ul>
      ) : null}
    </>
  );
}
