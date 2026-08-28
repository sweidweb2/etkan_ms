import type { FieldErrors } from "@/types/auth";

export interface ManagerGalleryImageRow {
  id: string;
  name: string;
  direct_url: string;
  created_at: string;
  updated_at: string;
}

export type CreateGalleryImageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  image?: ManagerGalleryImageRow;
};

export type BulkCreateGalleryImagesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  images?: ManagerGalleryImageRow[];
};

export type UpdateGalleryImageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  image?: ManagerGalleryImageRow;
};

export type DeleteGalleryImageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
