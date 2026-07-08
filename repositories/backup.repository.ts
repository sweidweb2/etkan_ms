import type { BackupTableName } from "@/lib/constants/backup-tables";

type BackupQueryResult = Promise<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

type BackupClient = {
  from: (tableName: string) => {
    select: (columns: string) => BackupQueryResult;
  };
};

export async function exportTableRows(
  client: BackupClient,
  tableName: BackupTableName
) {
  return client.from(tableName).select("*");
}
