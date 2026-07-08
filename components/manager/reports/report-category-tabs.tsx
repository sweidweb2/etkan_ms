"use client";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_CATEGORY_ORDER,
} from "@/lib/constants/manager-report-definitions";
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
import { cn } from "@/lib/utils";
import type { ReportCategory } from "@/types/manager-reports";

type ReportCategoryTabsProps = {
  value: ReportCategory;
  onChange: (category: ReportCategory) => void;
  className?: string;
};

export function ReportCategoryTabs({
  value,
  onChange,
  className,
}: ReportCategoryTabsProps) {
  return (
    <Card className={cn("flex h-full flex-col py-0 print:hidden", className)}>
      <CardHeader className="border-b bg-muted/40 py-4">
        <CardTitle className="text-base">Category</CardTitle>
        <CardDescription>Choose a report domain.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-4 py-4">
        <Select
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue) {
              onChange(nextValue as ReportCategory);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_CATEGORY_ORDER.map((category) => (
              <SelectItem key={category} value={category}>
                {REPORT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
