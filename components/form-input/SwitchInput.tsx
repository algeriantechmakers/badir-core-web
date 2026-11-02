"use client";

import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { FormInputProps } from "./types";

export const SwitchInput = ({
  name,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  className,
}: FormInputProps) => {
  return (
    <div className={cn("flex items-center justify-start gap-1", className)}>
      <Switch
        id={name}
        checked={(value as boolean) || false}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-checked:bg-secondary-500 border-primary-100"
        dir="rtl"
      />
      <label htmlFor={name} className="text-neutrals-600">
        {placeholder || label}
      </label>
    </div>
  );
};
