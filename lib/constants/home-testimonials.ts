import type { MessageKey } from "@/lib/i18n/messages";

export type HomeTestimonial = {
  id: string;
  quoteKey: MessageKey;
  rating: 5;
};

export const HOME_TESTIMONIALS: HomeTestimonial[] = [
  {
    id: "t1",
    quoteKey: "homeTestimonials.t1.quote",
    rating: 5,
  },
  {
    id: "t2",
    quoteKey: "homeTestimonials.t2.quote",
    rating: 5,
  },
  {
    id: "t3",
    quoteKey: "homeTestimonials.t3.quote",
    rating: 5,
  },
  {
    id: "t4",
    quoteKey: "homeTestimonials.t4.quote",
    rating: 5,
  },
];
