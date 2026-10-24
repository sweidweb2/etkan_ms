import { TeacherSettingsShell } from "@/components/teacher/settings/teacher-settings-shell";

type TeacherSettingsLayoutProps = {
  children: React.ReactNode;
};

export default function TeacherSettingsLayout({
  children,
}: TeacherSettingsLayoutProps) {
  return <TeacherSettingsShell>{children}</TeacherSettingsShell>;
}
