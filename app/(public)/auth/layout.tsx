export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 pt-24 pb-8">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}
