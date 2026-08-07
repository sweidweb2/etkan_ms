make the vitest,built,typescript,eslint tests and fix if ther e any pronblems and sure case fix don't break anything else


Implement a global top loading bar for the admin panel that provides navigation and network feedback. The loader should appear for route navigations, server actions, page data fetching, and table reloads (search, filters, pagination), but not for purely local UI interactions like opening modals, dropdowns, tabs with cached content, or accordions. Start the loader immediately (or after a configurable 100–200 ms delay to avoid flashing on very fast requests), animate quickly to about 15–20%, then continue progressing with easing and small random increments until reaching approximately 90–95%. Never reach 100% until the associated async operation has actually completed. When all tracked operations finish, animate smoothly to 100%, keep it visible briefly (150–300 ms), then fade it out and reset. If multiple async operations overlap, treat them as a single global loading session: keep the loader visible until the last pending operation completes, preventing flickering or restarting between concurrent requests.


Implement loading states using **Skeleton + Progressive Section Loading** in Next.js.

* **Do not use a full-page spinner** for page navigation or data fetching.
* **Render the page shell immediately** (layout, sidebar, header, page title, tabs, filters, and actions).
* Split the page into **independent data sections** (stats, tables, charts, cards, etc.).
* Each section must fetch its data independently and display its **own skeleton placeholder** until its data is ready.
* Sections should **render as soon as their own data is available**; never wait for all requests to finish before displaying content.
* Use **React Suspense** and Next.js `loading.tsx` or nested Suspense boundaries where appropriate to enable progressive rendering.
* Keep the layout dimensions stable to avoid layout shifts (CLS).
* If one section fails, show an **inline error state with a retry option** without blocking the rest of the page.
* Prefer **streaming and server components** where possible, while keeping interactive widgets as client components.
* The goal is to maximize **perceived performance** by making the page feel usable immediately, even if some sections are still loading.
