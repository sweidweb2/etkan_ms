import { GallerySection } from "@/components/public/gallery-section";
import { shuffleArray } from "@/lib/utils/shuffle-array";
import { listGalleryImagesForPublic } from "@/services/public/gallery-image.service";

export default async function GalleryPage() {
  const images = await listGalleryImagesForPublic();

  return <GallerySection images={shuffleArray(images)} />;
}
