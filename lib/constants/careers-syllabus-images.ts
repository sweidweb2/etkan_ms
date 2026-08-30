/** Decorative card images for syllabus courses on the home careers preview. */
export const CAREERS_SYLLABUS_COURSE_IMAGES: Record<string, string> = {
  "intro-to-programming":
    "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=1509&auto=format&fit=crop",
  arduino:
    "https://media.istockphoto.com/id/2276854525/photo/electronic-components-and-hardware-engineering-tools-organized-on-a-dark-work-desk-close-up.jpg?s=2048x2048&w=is&k=20&c=vL9Xly7erRY2XdCOi8Wss3hhe5ZsY7i9jFRZe9JbZdQ=",
  "data-and-computer":
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1170&auto=format&fit=crop",
  "tools-and-soldering":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1170&auto=format&fit=crop",
  solidworks:
    "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop",
  "3d-printing":
    "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop",
  "circuits-and-power":
    "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=1171&auto=format&fit=crop",
  "web-development":
    "https://media.istockphoto.com/id/1355140477/photo/top-view-of-laptop-with-text-html5.jpg?s=2048x2048&w=is&k=20&c=uSkopBhFAAajALqs8xZCXZODKXaOklYH_OikPcytYEI=",
  "mobile-development":
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1170&auto=format&fit=crop",
  "vibe-coding":
    "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop",
  "backend-development":
    "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop",
  "altium-and-electronics":
    "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1073&auto=format&fit=crop",
};

export const CAREERS_SYLLABUS_DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1170&auto=format&fit=crop";

export function getCareersSyllabusCourseImage(courseId: string): string {
  return CAREERS_SYLLABUS_COURSE_IMAGES[courseId] ?? CAREERS_SYLLABUS_DEFAULT_IMAGE;
}
