const { execSync } = require("child_process");
const fs = require("fs");

const AUTH_MOCK = `vi.mock("@/services/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));
`;

const files = [
  "services/user.service.test.ts",
  "services/student.service.test.ts",
  "services/relationship.service.test.ts",
  "services/equipment.service.test.ts",
  "services/borrow-equipment.service.test.ts",
  "services/semester.service.test.ts",
  "services/student-semester.service.test.ts",
  "services/session.service.test.ts",
  "services/student-course-grade.service.test.ts",
  "services/class-computed-grade-lock.service.test.ts",
  "services/class-final-exam.service.test.ts",
  "services/audit-log.service.test.ts",
];

for (const file of files) {
  try {
    execSync(`git checkout HEAD -- "${file}"`, { stdio: "pipe" });
  } catch {
    console.log("skip missing", file);
    continue;
  }

  let s = fs.readFileSync(file, "utf8");

  s = s.replace(
    /(\w+)\(\s*adminClient,\s*ROLES\.MANAGER/g,
    "$1(adminClient, actor.userId"
  );
  s = s.replace(
    /(\w+)\(\s*adminClient,\s*ROLES\.(TEACHER|STUDENT|ADMIN)/g,
    "$1(adminClient, null"
  );
  s = s.replace(
    /(adminClient),\s*\r?\n(\s*)ROLES\.MANAGER/g,
    "$1,\n$2actor.userId"
  );
  s = s.replace(
    /(adminClient),\s*\r?\n(\s*)ROLES\.(TEACHER|STUDENT|ADMIN)/g,
    "$1,\n$2null"
  );

  if (!s.includes("authorization.service")) {
    if (s.includes("const adminClient")) {
      s = s.replace("const adminClient", AUTH_MOCK + "\nconst adminClient");
    } else {
      console.warn("no adminClient anchor", file);
    }
  }

  if (s.includes("actor.userId") && !/\bconst actor\b/.test(s)) {
    console.warn("WARNING: no const actor in", file);
  }

  fs.writeFileSync(file, s);
  console.log("repatched", file);
}
