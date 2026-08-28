"use client";

import { useActionState, useState, useTransition } from "react";
import { createGalleryImagesBulkAction } from "@/app/manager/gallery/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import type {
  BulkCreateGalleryImagesActionState,
  ManagerGalleryImageRow,
} from "@/types/manager-gallery-image";

const initialState: BulkCreateGalleryImagesActionState = {};

const JSON_TEMPLATE = `[
  { "name": "Campus entrance", "direct_url": "https://example.com/image-1.jpg" },
  { "name": "Workshop day", "direct_url": "https://example.com/image-2.jpg" }
]`;

type BulkGalleryJsonFormProps = {
  onImagesCreated: (images: ManagerGalleryImageRow[]) => void;
};

export function BulkGalleryJsonForm({
  onImagesCreated,
}: BulkGalleryJsonFormProps) {
  const [value, setValue] = useState("");
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createGalleryImagesBulkAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, (nextState) => {
    setValue("");
    if (nextState.images?.length) {
      onImagesCreated(nextState.images);
    }
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set("records_json", value);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Card className="py-0">
      <CardHeader className="border-b py-3">
        <CardTitle>Create records from JSON</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Paste an array of records. Existing URLs are skipped, and up to 200
          records can be imported at once.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={JSON_TEMPLATE}
            spellCheck={false}
            disabled={isPending}
            rows={14}
            aria-label="Gallery records JSON"
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <InlineSpinner className="mr-2" />
                  Importing…
                </>
              ) : (
                "Import records"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
