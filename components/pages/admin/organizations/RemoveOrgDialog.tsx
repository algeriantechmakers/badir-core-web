"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { removeOrganization } from "@/actions/admin";

interface RemoveOrgDialogProps {
  orgId: string;
  orgName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function RemoveOrgDialog({
  orgId,
  orgName,
  trigger,
  onSuccess,
}: RemoveOrgDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`حذف المنظمة - ${orgName}`}
      description="سيتم حذف المنظمة وإبلاغ المالك بأن حسابه سيحذف نهائياً بعد 24 ساعة."
      confirmLabel="حذف"
      destructive
      requireConfirmation
      onConfirm={async (message) => {
        const result = await removeOrganization(orgId, message);
        if (!result.success) {
          throw new Error(result.error || "تعذر حذف المنظمة");
        }
        onSuccess?.();
      }}
    />
  );
}
