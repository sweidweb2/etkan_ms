export type PanelNavIconKey =
  | "layout-dashboard"
  | "users"
  | "book-open"
  | "calendar-days"
  | "server"
  | "library"
  | "calculator"
  | "bell"
  | "mail"
  | "send"
  | "school"
  | "package"
  | "layers"
  | "settings"
  | "reports"
  | "analytics"
  | "backup"
  | "logs"
  | "clock";

export type PanelNavItem = {
  title: string;
  href: string;
  icon: PanelNavIconKey;
};

export type PanelNavGroup = {
  id: string;
  label: string;
  items: PanelNavItem[];
  defaultOpen?: boolean;
};

export type PanelNavigation = {
  items?: PanelNavItem[];
  groups?: PanelNavGroup[];
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
  navigation: PanelNavigation;
};
