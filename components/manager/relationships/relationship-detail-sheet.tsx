"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FieldLabel } from "@/components/auth/field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { showSuccessToast } from "@/lib/toast";
import type { ManagerRelationshipRow } from "@/types/manager-relationship";

type RelationshipDetailFormProps = {
  relationship: ManagerRelationshipRow;
  onOpenChange: (open: boolean) => void;
  onUpdateRelationship: (relationship: ManagerRelationshipRow) => void;
};

function RelationshipDetailForm({
  relationship,
  onOpenChange,
  onUpdateRelationship,
}: RelationshipDetailFormProps) {
  const [form, setForm] = useState<ManagerRelationshipRow>(relationship);

  function updateField<K extends keyof ManagerRelationshipRow>(
    key: K,
    value: ManagerRelationshipRow[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      return;
    }

    onUpdateRelationship({
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      relation_with: form.relation_with?.trim() || null,
      major: form.major?.trim() || null,
      speciality: form.speciality?.trim() || null,
    });
    showSuccessToast("Relationship updated in the preview.");
    onOpenChange(false);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{form.name}</SheetTitle>
        <SheetDescription>
          View and edit relationship details. Changes are preview-only until
          backend is connected.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-name"
            label="Contact name"
            hint="Required"
          />
          <Input
            id="relationship-name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-phone"
            label="Phone"
            hint="Optional"
          />
          <Input
            id="relationship-phone"
            value={form.phone ?? ""}
            onChange={(event) => updateField("phone", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-relation"
            label="Relation"
            hint="Optional"
          />
          <Input
            id="relationship-relation"
            value={form.relation_with ?? ""}
            onChange={(event) =>
              updateField("relation_with", event.target.value)
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-major"
            label="Major"
            hint="Optional"
          />
          <Input
            id="relationship-major"
            value={form.major ?? ""}
            onChange={(event) => updateField("major", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor="relationship-speciality"
            label="Speciality"
            hint="Optional"
          />
          <Input
            id="relationship-speciality"
            value={form.speciality ?? ""}
            onChange={(event) =>
              updateField("speciality", event.target.value)
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="relationship-useful">Useful contact</Label>
            <p className="text-xs text-muted-foreground">
              Mark whether this relationship is helpful for follow-up.
            </p>
          </div>
          <Switch
            id="relationship-useful"
            checked={form.is_useful}
            onCheckedChange={(checked) => updateField("is_useful", checked)}
            aria-label="Useful contact"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="relationship-created">Created</Label>
          <Input
            id="relationship-created"
            value={format(new Date(form.created_at), "MMM d, yyyy 'at' h:mm a")}
            readOnly
            disabled
          />
        </div>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!form.name.trim()}>
          Save changes
        </Button>
      </SheetFooter>
    </>
  );
}

type RelationshipDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: ManagerRelationshipRow | null;
  onUpdateRelationship: (relationship: ManagerRelationshipRow) => void;
};

export function RelationshipDetailSheet({
  open,
  onOpenChange,
  relationship,
  onUpdateRelationship,
}: RelationshipDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {open && relationship ? (
          <RelationshipDetailForm
            key={relationship.id}
            relationship={relationship}
            onOpenChange={onOpenChange}
            onUpdateRelationship={onUpdateRelationship}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
