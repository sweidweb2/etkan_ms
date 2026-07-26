import type { CSSProperties, FormEvent, ReactNode } from "react";

export type CurvedInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string, event: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  buttonText?: string;
  type?: string;
  name?: string;
  ariaLabel?: string;
  theme?: "light" | "dark";
  width?: number | string;
  bend?: number;
  height?: number;
  cornerRadius?: number;
  borderWidth?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  iconColor?: string;
  shadowSize?: string;
  shadowColor?: string;
  showButton?: boolean;
  showIcon?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

declare function CurvedInput(props: CurvedInputProps): ReactNode;

export default CurvedInput;
