"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportDefinition, ReportId } from "@/types/manager-reports";
import { cn } from "@/lib/utils";

type ReportTypeSelectProps = {
  reports: ReportDefinition[];
  value: ReportId;
  onChange: (reportId: ReportId) => void;
  activeReport: ReportDefinition;
  className?: string;
};

export function ReportTypeSelect({
  reports,
  value,
  onChange,
  activeReport,
  className,
}: ReportTypeSelectProps) {
  return (
    <Card className={cn("flex h-full flex-col py-0 print:hidden", className)}>
      <CardHeader className="border-b bg-muted/40 py-3">
        <CardTitle className="text-base">Report type</CardTitle>
        <CardDescription className="line-clamp-2">
          {activeReport.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-4 pt-2 pb-3">
        <Select
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue) {
              onChange(nextValue as ReportId);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a report" />
          </SelectTrigger>
          <SelectContent>
            {reports.map((report) => (
              <SelectItem key={report.id} value={report.id}>
                {report.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
