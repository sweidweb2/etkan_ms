/**
 * Private Supabase Storage bucket for automated weekly SQL dumps
 * (public tables + auth.users/identities). Not part of media export.
 */
export const DATABASE_BACKUPS_STORAGE_BUCKET = "database-backups" as const;

/** 200 MiB — large SQL dumps of public + auth data. */
export const DATABASE_BACKUPS_FILE_SIZE_LIMIT = 209_715_200;
