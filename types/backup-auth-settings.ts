export interface BackupAuthSettingsPayload {
  exportedAt: string;
  scope: "auth_settings";
  projectRef: string | null;
  complete: boolean;
  publicSettings: Record<string, unknown> | null;
  managementConfig: Record<string, unknown> | null;
  missing: string[];
  notes: string[];
}
