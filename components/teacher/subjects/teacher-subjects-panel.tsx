"use client";

import { useState } from "react";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditSubjectLinksDialog } from "@/components/teacher/subjects/edit-subject-links-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { TeacherSubjectRow } from "@/types/teacher-class";

type TeacherSubjectsPanelProps = {
  rows: TeacherSubjectRow[];
};

function LinkCell({ href }: { href: string | null }) {
  if (!href) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      Open
      <ExternalLinkIcon className="size-3.5" />
    </a>
  );
}

export function TeacherSubjectsPanel({
  rows: initialRows,
}: TeacherSubjectsPanelProps) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<TeacherSubjectRow | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subjects from classes you teach. Edit syllabus, reference, and handout
          links.
        </p>
      </div>

      {editing ? (
        <EditSubjectLinksDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
            }
          }}
          subject={editing}
          onSubjectUpdated={(subject) => {
            setRows((current) =>
              current.map((row) => (row.id === subject.id ? subject : row))
            );
          }}
        />
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>Subjects</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Subject</TableHead>
                <TableHead className="px-4">Classes</TableHead>
                <TableHead className="px-4">Syllabus</TableHead>
                <TableHead className="px-4">Reference</TableHead>
                <TableHead className="px-4">Handout</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="h-24 px-4 text-center text-muted-foreground whitespace-normal"
                  >
                    No subjects yet. Assign yourself to a class to see its
                    subject here.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-transparent">
                    <TableCell className="px-4 font-medium whitespace-normal">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-4 tabular-nums text-muted-foreground">
                      {row.taught_class_count}
                    </TableCell>
                    <TableCell className="px-4">
                      <LinkCell href={row.syllabus_link} />
                    </TableCell>
                    <TableCell className="px-4">
                      <LinkCell href={row.reference_link} />
                    </TableCell>
                    <TableCell className="px-4">
                      <LinkCell href={row.handout_link} />
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Can permission={PERMISSIONS.SUBJECTS_UPDATE}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit links for ${row.name}`}
                          onClick={() => setEditing(row)}
                        >
                          <PencilIcon />
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
