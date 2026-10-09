"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { freezeOrganization, unfreezeOrganization } from "@/actions/admin";

interface FreezeOrgDialogProps {
  orgId: string;
  orgName: string;
  trigger: React.ReactNode;
  isFrozen: boolean;
  onSuccess?: () => void;
}

export default function FreezeOrgDialog({
  orgId,
  orgName,
  trigger,
  isFrozen = false,
  onSuccess,
}: FreezeOrgDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={
        isFrozen
          ? `إعادة تفعيل المنظمة - ${orgName}`
          : `تجميد المنظمة - ${orgName}`
      }
      description={
        isFrozen
          ? "سيتم إعادة تفعيل المنظمة."
          : "سيتم تعطيل المنظمة وإرسال رسالة إلى مالكها."
      }
      confirmLabel={isFrozen ? "إعادة تفعيل" : "تجميد"}
      onConfirm={async (message) => {
        const result = isFrozen
          ? await unfreezeOrganization(orgId, message)
          : await freezeOrganization(orgId, message);
        if (!result.success) {
          throw new Error(
            result.error || isFrozen ? "تعذّر إعادة التفعيل" : "تعذّر التجميد",
          );
        }
        onSuccess?.();
      }}
    />
  );
}
