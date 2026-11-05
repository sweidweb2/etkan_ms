"use client";

import { useEffect, useRef, useState } from "react";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { AVATAR_ACCEPT } from "@/lib/avatars/avatar-file";
import { optimizeAvatarInBrowser } from "@/lib/avatars/optimize-avatar-client";
import type { AvatarActionState } from "@/types/student-avatar";

type AvatarAction = (
  prevState: AvatarActionState,
  formData: FormData
) => Promise<AvatarActionState>;

const initialState: AvatarActionState = {};

type ChangeAvatarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  currentAvatarUrl: string | null;
  uploadAction: AvatarAction;
  removeAction: AvatarAction;
  /** Extra form fields sent with both actions (e.g. manager target ids). */
  hiddenFields?: Record<string, string>;
  onAvatarChange: (avatarUrl: string | null) => void;
};

export function ChangeAvatarDialog({
  open,
  onOpenChange,
  name,
  currentAvatarUrl,
  uploadAction,
  removeAction,
  hiddenFields,
  onAvatarChange,
}: ChangeAvatarDialogProps) {
  const [uploadState, submitUpload, isUploadPending] = useFormActionState(
    uploadAction,
    initialState
  );
  const [removeState, submitRemove, isRemovePending] = useFormActionState(
    removeAction,
    initialState
  );
  const isPending = isUploadPending || isRemovePending;

  const previewUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function resetSelection() {
    requestRef.current += 1;
    revokePreview();
    setPreparedFile(null);
    setPreviewUrl(null);
    setIsPreparing(false);
    setFileError(null);
  }

  useEffect(() => revokePreview, []);

  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      resetSelection();
    }
    onOpenChange(nextOpen);
  });

  useActionStateToast(uploadState, isUploadPending);
  useActionStateToast(removeState, isRemovePending);
  useActionStateSuccess(uploadState, isUploadPending, (nextState) => {
    onAvatarChange(nextState.avatar_url ?? null);
    resetSelection();
    onOpenChange(false);
  });
  useActionStateSuccess(removeState, isRemovePending, () => {
    onAvatarChange(null);
    resetSelection();
    onOpenChange(false);
  });

  function buildFormData(): FormData {
    const formData = new FormData();
    Object.entries(hiddenFields ?? {}).forEach(([key, value]) => {
      formData.set(key, value);
    });
    return formData;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) {
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    revokePreview();
    setPreparedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    setIsPreparing(true);

    const result = await optimizeAvatarInBrowser(nextFile);
    if (requestId !== requestRef.current) {
      if (result.ok) {
        URL.revokeObjectURL(result.previewUrl);
      }
      return;
    }

    setIsPreparing(false);
    if (!result.ok) {
      setFileError(result.error);
      return;
    }

    previewUrlRef.current = result.previewUrl;
    setPreviewUrl(result.previewUrl);
    setPreparedFile(result.file);
  }

  function handleUpload() {
    if (!preparedFile) {
      return;
    }
    const formData = buildFormData();
    formData.set("image", preparedFile);
    submitUpload(formData);
  }

  function handleRemove() {
    submitRemove(buildFormData());
  }

  const shownAvatarUrl = previewUrl ?? currentAvatarUrl;
  const canRemove = Boolean(currentAvatarUrl) && !previewUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Profile photo</DialogTitle>
          <DialogDescription className="text-xs">
            JPEG, PNG, or WebP up to 10 MB. The photo is cropped to a square
            and saved as WebP.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <ProfileAvatar name={name} avatarUrl={shownAvatarUrl} size="lg" />
          <div className="flex w-full flex-col gap-2">
            <Input
              type="file"
              accept={AVATAR_ACCEPT}
              aria-label="Choose a profile photo"
              disabled={isPending || isPreparing}
              onChange={(event) => {
                void handleFileChange(event);
              }}
            />
            {isPreparing ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <InlineSpinner />
                Preparing photo…
              </p>
            ) : null}
            {preparedFile && !isPreparing ? (
              <p className="text-xs text-muted-foreground">
                Ready to upload. Press Save to apply.
              </p>
            ) : null}
            {fileError ? (
              <p className="text-sm text-destructive">{fileError}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {canRemove ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={isPending || isPreparing}
            >
              {isRemovePending ? <InlineSpinner /> : null}
              Remove photo
            </Button>
          ) : (
            <span aria-hidden />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={isPending || isPreparing || !preparedFile}
            >
              {isUploadPending ? <InlineSpinner /> : null}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
