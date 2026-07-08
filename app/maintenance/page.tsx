import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Maintenance mode
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app is temporarily unavailable. Please try again later.
            </p>
          </div>

          <div className="text-sm">
            Manager can turn it off here:{" "}
            <Link className="underline" href="/manager/settings">
              Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

