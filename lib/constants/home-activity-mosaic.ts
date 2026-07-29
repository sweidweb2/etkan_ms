/**
 * Project mosaic cells for the home activity section.
 * Set `src` when you have photos; leave `null` for a placeholder tile.
 */
export type HomeMosaicCell = {
  id: string;
  src: string | null;
  alt?: string;
};

const PLACEHOLDER_COUNT = 64;

export const HOME_ACTIVITY_MOSAIC: HomeMosaicCell[] = Array.from(
  { length: PLACEHOLDER_COUNT },
  (_, i) => ({
    id: `mosaic-${i + 1}`,
    src: null,
  })
);
