"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { freezeOrganization } from "@/actions/admin";

interface FreezeOrgDialogProps {
  orgId: string;
  orgName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function FreezeOrgDialog({
  orgId,
  orgName,
  trigger,
  onSuccess,
}: FreezeOrgDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`تجميد المنظمة - ${orgName}`}
      description="سيتم تعطيل المنظمة وإرسال رسالة إلى مالكها."
      confirmLabel="تجميد"
      onConfirm={async (message) => {
        const result = await freezeOrganization(orgId, message);
        if (!result.success) {
          throw new Error(result.error || "تعذر تجميد المنظمة");
        }
        onSuccess?.();
      }}
    />
  );
}
