import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Placeholder profile settings for teachers. */
export function TeacherSettingsMyInfoPanel() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My info</CardTitle>
        <CardDescription>
          Profile details and account options will live here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
