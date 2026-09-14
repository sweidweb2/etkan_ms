export function BlogsListSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
      <div className="mb-10 max-w-3xl sm:mb-12">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex flex-col gap-12 md:gap-16">
        <div className="hidden h-[28rem] w-full animate-pulse rounded-2xl bg-muted md:block lg:h-[36rem]" />
        <div className="flex flex-col gap-5 md:hidden">
          <div className="aspect-[1.5] w-full animate-pulse rounded-2xl bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>

        <div className="flex justify-center">
          <div className="flex gap-2 rounded-lg bg-muted/60 p-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-9 w-24 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        </div>

        <ul className="grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="flex flex-col gap-5">
              <div className="aspect-[1.5] w-full animate-pulse rounded-2xl bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="flex items-center gap-2">
                <div className="size-8 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BlogDetailSkeleton() {
  return (
    <article className="relative px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-muted" />
        <div className="mt-3 h-10 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-5 w-full animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-5/6 animate-pulse rounded bg-muted" />
        <div className="mt-8 flex gap-6">
          <div className="flex items-center gap-2">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-10 aspect-[1.6] w-full animate-pulse rounded-2xl bg-muted" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-4 w-full animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </div>
    </article>
  );
}
