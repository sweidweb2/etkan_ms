type TeacherSettingsLayoutProps = {
  children: React.ReactNode;
};

/** Pass-through — section switching is client-side in TeacherSettingsPanel. */
export default function TeacherSettingsLayout({
  children,
}: TeacherSettingsLayoutProps) {
  return children;
}
