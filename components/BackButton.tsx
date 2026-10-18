"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import AppButton from "./AppButton";

export default function BackButton({
  url,
  label = "العودة",
}: {
  url?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <AppButton
      type="outline"
      onClick={() => (url ? router.replace(url) : router.back())}
      icon={<ChevronLeft className="h-4 w-4" />}
      size="sm"
      border="square"
    >
      {label}
    </AppButton>
  );
}
