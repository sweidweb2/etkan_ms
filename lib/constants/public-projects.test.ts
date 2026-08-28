import { describe, expect, it } from "vitest";
import { groupProjectsIntoPublicSections } from "@/lib/constants/public-projects";

const tap2eat = {
  id: "11111111-1111-4111-8111-111111111111",
  classification: "etkan",
  category: "Web app",
  title: "Tap2Eat",
  body: "A restaurants directory.",
  author: "Etkan team",
  image_url: "https://example.com/tap2eat.png",
  href: "https://tap2eat.food",
  created_at: "2026-01-02T00:00:00.000Z",
};

const etkanMs = {
  id: "22222222-2222-4222-8222-222222222222",
  classification: "teachers",
  category: "Web app",
  title: "Etkan MS",
  body: "School management system.",
  author: null,
  image_url: "https://example.com/etkan.png",
  href: "/",
  created_at: "2026-01-01T00:00:00.000Z",
};

const laterEtkan = {
  id: "33333333-3333-4333-8333-333333333333",
  classification: "etkan",
  category: "Mobile app",
  title: "3DBey",
  body: "3D printing store.",
  author: null,
  image_url: "https://example.com/3dbey.png",
  href: "https://3dbey.com",
  created_at: "2026-01-03T00:00:00.000Z",
};

describe("groupProjectsIntoPublicSections", () => {
  it("groups projects into etkan, students, and teachers in created order", () => {
    const sections = groupProjectsIntoPublicSections([
      laterEtkan,
      etkanMs,
      tap2eat,
    ]);

    expect(sections.map((section) => section.id)).toEqual([
      "etkan",
      "students",
      "teachers",
    ]);
    expect(sections[0]?.projects.map((project) => project.title)).toEqual([
      "Tap2Eat",
      "3DBey",
    ]);
    expect(sections[1]?.projects).toEqual([]);
    expect(sections[2]?.projects.map((project) => project.title)).toEqual([
      "Etkan MS",
    ]);
    expect(sections[2]?.projects[0]?.imageSrc).toBe(etkanMs.image_url);
    expect(sections[2]?.projects[0]?.href).toBe("/");
    expect(sections[0]?.projects[0]?.author).toBe("Etkan team");
  });
});
