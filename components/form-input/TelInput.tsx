"use client";

import { forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getBaseInputClasses } from "./shared";
import { generateCountryOptions } from "./utils";
import { FormInputProps } from "./types";

export const TelInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      name,
      placeholder,
      value,
      onChange,
      onBlur,
      disabled,
      error,
      countryCode = "DZ",
      onCountryChange,
      ...props
    },
    ref,
  ) => {
    const baseInputClasses = getBaseInputClasses(error);
    const countryOptions = useMemo(() => generateCountryOptions(), []);
    const selectedCountry =
      countryOptions.find((country) => country.code === countryCode) ||
      countryOptions[0];

    return (
      <div className="flex gap-2">
        <Input
          ref={ref}
          id={name}
          name={name}
          placeholder={placeholder || "Enter phone number"}
          value={(value as string) || ""}
          onChange={(e) => {
            const cleanedValue = e.target.value.replace(/[^\d\s]/g, "");
            onChange?.(cleanedValue);
          }}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(baseInputClasses, "flex-1")}
          style={{ direction: "ltr", textAlign: "left" }}
          {...props}
          type="text"
        />
        <Select
          value={selectedCountry?.code}
          onValueChange={(value) => value && onCountryChange?.(value)}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "border-neutrals-300 bg-neutrals-100 w-32 rounded-full border px-3 py-2",
              "focus:border-secondary-600 focus:ring-secondary-600 focus:ring-1 focus:outline-none",
              error &&
                "border-state-error focus:border-state-error focus:ring-state-error",
              disabled && "bg-neutrals-200 cursor-not-allowed",
            )}
          >
            <SelectValue>
              <span className="text-sm">{selectedCountry?.callingCode}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {country.callingCode}
                  </span>
                  <span className="text-neutrals-500 text-xs">
                    {country.name}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

TelInput.displayName = "TelInput";
