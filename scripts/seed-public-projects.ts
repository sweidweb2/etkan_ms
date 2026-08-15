import type { PublicProjectClassificationValue } from "@/lib/constants/manager-public-project";
import * as publicProjectRepository from "@/repositories/public-project.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

type SeedPublicProject = {
  classification: PublicProjectClassificationValue;
  category: string;
  title: string;
  body: string;
  image_url: string;
  href: string;
};

const SEED_PUBLIC_PROJECTS: SeedPublicProject[] = [
  {
    classification: "teachers",
    category: "Web app",
    title: "Etkan MS",
    body: "This school management system—administration, students, and daily school operations in one platform.",
    image_url:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=900&auto=format&fit=crop",
    href: "/",
  },
  {
    classification: "etkan",
    category: "Web app",
    title: "Tap2Eat",
    body: "A restaurants directory at tap2eat.food—discover places to eat, browse venues, and explore food spots in one place.",
    image_url:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop",
    href: "https://tap2eat.food",
  },
  {
    classification: "etkan",
    category: "Web app",
    title: "3DBey",
    body: "A 3D printing ecommerce store at 3dbey.com—browse and order printed parts and products online.",
    image_url:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
    href: "https://3dbey.com",
  },
];

async function main() {
  const client = createSeedAdminClient();
  const existing = await publicProjectRepository.listPublicProjects(client);

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const existingTitles = new Set(
    (existing.data ?? []).map((row) => row.title.trim().toLowerCase())
  );

  let inserted = 0;
  let skipped = 0;

  for (const project of SEED_PUBLIC_PROJECTS) {
    if (existingTitles.has(project.title.trim().toLowerCase())) {
      skipped += 1;
      continue;
    }

    const { error } = await publicProjectRepository.createPublicProject(
      client,
      project
    );

    if (error) {
      throw new Error(error.message);
    }

    existingTitles.add(project.title.trim().toLowerCase());
    inserted += 1;
  }

  console.log(
    `Projects seed: inserted ${inserted}, skipped ${skipped} already present (${SEED_PUBLIC_PROJECTS.length} in seed).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
