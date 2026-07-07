import { UserDetailsPanel } from "@/components/manager/users/user-details-panel";

type ManagerUserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerUserDetailPage({
  params,
}: ManagerUserDetailPageProps) {
  const { id } = await params;

  return <UserDetailsPanel userId={id} />;
}
