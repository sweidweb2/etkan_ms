import type { FieldErrors } from "@/types/auth";

export interface ManagerGalleryImageRow {
  id: string;
  name: string;
  /** Object path in the gallery bucket, including the gallery/ prefix. */
  storagePath: string;
  /** Public URL built from storagePath. */
  url: string;
  created_at: string;
  updated_at: string;
}

export type ManagerGalleryListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type ManagerGalleryListData = {
  images: ManagerGalleryImageRow[];
  totalCount: number;
  catalogCount: number;
  page: number;
  pageSize: number;
};

export type CreateGalleryImageActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  image?: ManagerGalleryImageRow;
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
