export interface ManagerRelationshipRow {
  id: string;
  name: string;
  phone: string | null;
  relation_with: string | null;
  major: string | null;
  speciality: string | null;
  is_useful: boolean;
  created_at: string;
}
