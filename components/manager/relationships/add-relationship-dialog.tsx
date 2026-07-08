"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldLabel } from "@/components/auth/field-label";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { showSuccessToast } from "@/lib/toast";
import {
  createRelationshipSchema,
  type CreateRelationshipInput,
} from "@/lib/validators/manager/create-relationship";
import type { ManagerRelationshipRow } from "@/types/manager-relationship";

type AddRelationshipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRelationship: (relationship: ManagerRelationshipRow) => void;
};

export function AddRelationshipDialog({
  open,
  onOpenChange,
  onCreateRelationship,
}: AddRelationshipDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRelationshipInput>({
    resolver: zodResolver(createRelationshipSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      relation_with: "",
      major: "",
      speciality: "",
      is_useful: true,
    },
  });

  const isUseful = watch("is_useful");

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        phone: "",
        relation_with: "",
        major: "",
        speciality: "",
        is_useful: true,
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateRelationshipInput) {
    onCreateRelationship({
      id: crypto.randomUUID(),
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      relation_with: values.relation_with?.trim() || null,
      major: values.major?.trim() || null,
      speciality: values.speciality?.trim() || null,
      is_useful: values.is_useful,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("Relationship added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>
            Create a standalone contact record. Data is preview-only until
            backend is connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-relationship-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-name"
              label="Contact name"
              hint="Required"
            />
            <Input
              id="add-relationship-name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-phone"
              label="Phone"
              hint="Optional"
            />
            <Input
              id="add-relationship-phone"
              maxLength={AUTH_LIMITS.phone.max}
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-relation"
              label="Relation"
              hint="Optional"
            />
            <Input
              id="add-relationship-relation"
              aria-invalid={!!errors.relation_with}
              {...register("relation_with")}
            />
            {errors.relation_with ? (
              <p className="text-sm text-destructive">
                {errors.relation_with.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-major"
              label="Major"
              hint="Optional"
            />
            <Input
              id="add-relationship-major"
              aria-invalid={!!errors.major}
              {...register("major")}
            />
            {errors.major ? (
              <p className="text-sm text-destructive">{errors.major.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-relationship-speciality"
              label="Speciality"
              hint="Optional"
            />
            <Input
              id="add-relationship-speciality"
              aria-invalid={!!errors.speciality}
              {...register("speciality")}
            />
            {errors.speciality ? (
              <p className="text-sm text-destructive">
                {errors.speciality.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="add-relationship-useful">Useful contact</Label>
              <p className="text-xs text-muted-foreground">
                Defaults to useful for new relationships.
              </p>
            </div>
            <Switch
              id="add-relationship-useful"
              checked={isUseful}
              onCheckedChange={(checked) =>
                setValue("is_useful", checked, { shouldValidate: true })
              }
              aria-label="Useful contact"
            />
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-relationship-form">
            Create relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
