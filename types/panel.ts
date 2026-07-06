export type PanelNavIconKey =
  | "layout-dashboard"
  | "users"
  | "book-open"
  | "calendar-days"
  | "server";

export type PanelNavItem = {
  title: string;
  href: string;
  icon: PanelNavIconKey;
};

export type PanelVariant =
  | "admin"
  | "manager"
  | "ceo"
  | "teacher"
  | "student";

export type PanelConfig = {
  variant: PanelVariant;
  label: string;
  navItems: PanelNavItem[];
};
