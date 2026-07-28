import { ROLES } from "@/lib/constants/roles";
import { STUDENT_CLASS_STATUSES } from "@/lib/constants/manager-student-class-status";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { ensureStudentRegistration } from "@/services/profile.service";
import { syncAuthUserRole } from "@/services/role.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DEMO_MARKER = "Demo Fall 2026";

function getDefaultPassword(): string {
  return process.env.SEED_DEMO_PASSWORD ?? "Demo123!";
}

type SeedTeacher = {
  username: string;
  email: string;
  fullName: string;
};

type SeedStudent = {
  username: string;
  email: string;
  fullName: string;
  phone?: string;
};

async function findOrCreateSemester(
  client: Supabase,
  input: { name: string; amount: number; nbCourses: number; startDate?: string }
) {
  const existing = await semesterRepository.findSemesterByName(client, input.name);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id;

  const { data, error } = await semesterRepository.createSemester(client, {
    name: input.name,
    amount: input.amount,
    nb_courses: input.nbCourses,
    start_date: input.startDate ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? `Unable to create semester "${input.name}".`);
  }

  return data.id;
}

async function findOrCreateSubject(
  client: Supabase,
  input: { name: string; nbSessions: number }
) {
  const existing = await subjectRepository.findSubjectByName(client, input.name);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id;

  const { data, error } = await subjectRepository.createSubject(client, {
    name: input.name,
    nb_sessions: input.nbSessions,
  });

  if (error || !data) {
    throw new Error(error?.message ?? `Unable to create subject "${input.name}".`);
  }

  return data.id;
}

async function findOrCreateClass(
  client: Supabase,
  input: {
    name: string;
    subjectId: string;
    semesterId: string;
    status: string;
  }
) {
  const { data: classes, error } = await classRepository.listClassesBySemesterId(
    client,
    input.semesterId
  );

  if (error) throw new Error(error.message);

  const existing = (classes ?? []).find(
    (row) => row.name.toLowerCase() === input.name.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await classRepository.createClass(client, {
    name: input.name,
    subject_id: input.subjectId,
    semester_id: input.semesterId,
    status: input.status,
  });

  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? `Unable to create class "${input.name}".`);
  }

  await syncSemesterCourseCount(client, input.semesterId);

  return created.data.id;
}

async function syncSemesterCourseCount(client: Supabase, semesterId: string) {
  const countResult = await classRepository.countClassesBySemesterId(
    client,
    semesterId
  );

  if (countResult.error) throw new Error(countResult.error.message);

  const { error } = await semesterRepository.updateSemesterNbCourses(
    client,
    semesterId,
    countResult.count ?? 0
  );

  if (error) throw new Error(error.message);
}

async function findOrCreateTeacher(
  client: Supabase,
  input: SeedTeacher
): Promise<string> {
  const existingProfile = await profileRepository.findProfileByUsername(
    client,
    input.username
  );

  if (existingProfile.data) {
    return existingProfile.data.id;
  }

  const existingEmail = await authRepository.findAuthUserByEmail(
    client,
    input.email
  );
  if (existingEmail.error) throw new Error(existingEmail.error.message);
  if (existingEmail.data?.user) {
    return existingEmail.data.user.id;
  }

  const { data: authData, error: authError } = await authRepository.createAuthUser(
    client,
    {
      email: input.email,
      password: getDefaultPassword(),
      username: input.username,
      fullName: input.fullName,
      role: ROLES.TEACHER,
    }
  );

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? `Unable to create teacher ${input.username}.`);
  }

  const authUserId = authData.user.id;

  try {
    const { error: profileError } = await profileRepository.createProfile(client, {
      id: authUserId,
      username: input.username,
      role: ROLES.TEACHER,
    });

    if (profileError) throw new Error(profileError.message);

    await syncAuthUserRole(client, authUserId, ROLES.TEACHER);
    return authUserId;
  } catch (error) {
    await authRepository.deleteAuthUser(client, authUserId);
    throw error;
  }
}

async function findOrCreateStudent(
  client: Supabase,
  input: SeedStudent
): Promise<{ userId: string; studentProfileId: string }> {
  const existingProfile = await profileRepository.findProfileByUsername(
    client,
    input.username
  );

  if (existingProfile.data) {
    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(
        client,
        existingProfile.data.id
      );

    if (studentProfile.error) throw new Error(studentProfile.error.message);
    if (!studentProfile.data) {
      throw new Error(
        `Profile exists for ${input.username} but student_profiles row is missing.`
      );
    }

    return {
      userId: existingProfile.data.id,
      studentProfileId: studentProfile.data.id,
    };
  }

  const existingEmail = await authRepository.findAuthUserByEmail(
    client,
    input.email
  );
  if (existingEmail.error) throw new Error(existingEmail.error.message);

  if (existingEmail.data?.user) {
    const userId = existingEmail.data.user.id;
    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(client, userId);

    if (!studentProfile.data) {
      throw new Error(
        `Auth user exists for ${input.email} but related rows are incomplete.`
      );
    }

    return {
      userId,
      studentProfileId: studentProfile.data.id,
    };
  }

  const { data: authData, error: authError } = await authRepository.createAuthUser(
    client,
    {
      email: input.email,
      password: getDefaultPassword(),
      username: input.username,
      fullName: input.fullName,
      role: ROLES.STUDENT,
    }
  );

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? `Unable to create student ${input.username}.`);
  }

  const authUserId = authData.user.id;

  try {
    await ensureStudentRegistration(client, {
      authId: authUserId,
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: ROLES.STUDENT,
    });

    await syncAuthUserRole(client, authUserId, ROLES.STUDENT);

    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(client, authUserId);

    if (studentProfile.error) throw new Error(studentProfile.error.message);
    if (!studentProfile.data) {
      throw new Error(`Student registration incomplete for ${input.username}.`);
    }

    return {
      userId: authUserId,
      studentProfileId: studentProfile.data.id,
    };
  } catch (error) {
    await authRepository.deleteAuthUser(client, authUserId);
    throw error;
  }
}

async function ensureTeacherAssignedToClass(
  client: Supabase,
  teacherId: string,
  classId: string
) {
  const existing = await classTeacherRepository.findClassTeacherByTeacherAndClass(
    client,
    teacherId,
    classId
  );

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const { error } = await classTeacherRepository.createClassTeacher(client, {
    teacher_id: teacherId,
    class_id: classId,
    assigned_by: null,
  });

  if (error) throw new Error(error.message);
}

async function ensureStudentSemesterEnrollment(
  client: Supabase,
  studentProfileId: string,
  semesterId: string
) {
  const existing =
    await studentSemesterRepository.findEnrollmentByStudentAndSemester(
      client,
      studentProfileId,
      semesterId
    );

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const { error } = await studentSemesterRepository.createStudentSemesterEnrollment(
    client,
    {
      student_profile_id: studentProfileId,
      semester_id: semesterId,
      status: "active",
    }
  );

  if (error) throw new Error(error.message);
}

async function ensureStudentClassEnrollment(
  client: Supabase,
  userId: string,
  classId: string
) {
  const existing = await studentClassRepository.findStudentClassByUserAndClass(
    client,
    userId,
    classId
  );

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const { error } = await studentClassRepository.createStudentClassEnrollment(
    client,
    {
      user_id: userId,
      class_id: classId,
      status: STUDENT_CLASS_STATUSES.ENROLLED,
    }
  );

  if (error) throw new Error(error.message);
}

async function seedDemoData(): Promise<void> {
  const client = createSeedAdminClient();

  const marker = await semesterRepository.findSemesterByName(client, DEMO_MARKER);
  if (marker.error) throw new Error(marker.error.message);

  const fallSemesterId = marker.data
    ? marker.data.id
    : await findOrCreateSemester(client, {
        name: DEMO_MARKER,
        amount: 500,
        nbCourses: 1,
        startDate: "2026-09-01",
      });

  const springSemesterId = await findOrCreateSemester(client, {
    name: "Demo Spring 2027",
    amount: 550,
    nbCourses: 1,
    startDate: "2027-02-01",
  });

  const mathSubjectId = await findOrCreateSubject(client, {
    name: "Demo Mathematics",
    nbSessions: 12,
  });

  const physicsSubjectId = await findOrCreateSubject(client, {
    name: "Demo Physics",
    nbSessions: 10,
  });

  const mathClassId = await findOrCreateClass(client, {
    name: "Demo Math 101",
    subjectId: mathSubjectId,
    semesterId: fallSemesterId,
    status: "in_progress",
  });

  const physicsClassId = await findOrCreateClass(client, {
    name: "Demo Physics 101",
    subjectId: physicsSubjectId,
    semesterId: springSemesterId,
    status: "scheduled",
  });

  const mathTeacherId = await findOrCreateTeacher(client, {
    username: "demo.teacher.math",
    email: "demo.teacher.math@example.com",
    fullName: "Demo Math Teacher",
  });

  const physicsTeacherId = await findOrCreateTeacher(client, {
    username: "demo.teacher.physics",
    email: "demo.teacher.physics@example.com",
    fullName: "Demo Physics Teacher",
  });

  await ensureTeacherAssignedToClass(client, mathTeacherId, mathClassId);
  await ensureTeacherAssignedToClass(client, physicsTeacherId, physicsClassId);

  const mathStudents: SeedStudent[] = [
    {
      username: "demo.student.alice",
      email: "demo.student.alice@example.com",
      fullName: "Alice Anderson",
      phone: "+1-555-0101",
    },
    {
      username: "demo.student.bob",
      email: "demo.student.bob@example.com",
      fullName: "Bob Baker",
      phone: "+1-555-0102",
    },
    {
      username: "demo.student.carol",
      email: "demo.student.carol@example.com",
      fullName: "Carol Clark",
      phone: "+1-555-0103",
    },
    {
      username: "demo.student.david",
      email: "demo.student.david@example.com",
      fullName: "David Davis",
      phone: "+1-555-0104",
    },
  ];

  const physicsStudents: SeedStudent[] = [
    {
      username: "demo.student.eve",
      email: "demo.student.eve@example.com",
      fullName: "Eve Edwards",
      phone: "+1-555-0105",
    },
    {
      username: "demo.student.frank",
      email: "demo.student.frank@example.com",
      fullName: "Frank Foster",
      phone: "+1-555-0106",
    },
    {
      username: "demo.student.grace",
      email: "demo.student.grace@example.com",
      fullName: "Grace Green",
      phone: "+1-555-0107",
    },
  ];

  for (const student of mathStudents) {
    const created = await findOrCreateStudent(client, student);
    await ensureStudentSemesterEnrollment(
      client,
      created.studentProfileId,
      fallSemesterId
    );
    await ensureStudentClassEnrollment(client, created.userId, mathClassId);
  }

  for (const student of physicsStudents) {
    const created = await findOrCreateStudent(client, student);
    await ensureStudentSemesterEnrollment(
      client,
      created.studentProfileId,
      springSemesterId
    );
    await ensureStudentClassEnrollment(client, created.userId, physicsClassId);
  }

  console.log("Demo seed data ready.");
  console.log("");
  console.log("Semesters:");
  console.log(`  - ${DEMO_MARKER}`);
  console.log("  - Demo Spring 2027");
  console.log("");
  console.log("Classes:");
  console.log("  - Demo Math 101 (Fall, 4 students, demo.teacher.math)");
  console.log("  - Demo Physics 101 (Spring, 3 students, demo.teacher.physics)");
  console.log("");
  console.log(`Default password for all demo users: ${getDefaultPassword()}`);
  console.log("Run `npx tsx scripts/seed-admin.ts` first if you need the admin user.");
}

seedDemoData().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Demo seed failed.";
  console.error(message);
  process.exit(1);
});
