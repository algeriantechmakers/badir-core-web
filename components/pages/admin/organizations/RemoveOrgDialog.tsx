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
      description="ستتم جدولة حذف المنظمة وحساب مالكها بعد 24 ساعة، وسيتم إبلاغه بذلك. يمكن الاعتراض خلال هذه المهلة."
      confirmLabel="حذف"
      destructive
      requireConfirmation
      onConfirm={async (message) => {
        const result = await removeOrganization(orgId, message);
        return result;
      }}
      onSuccess={onSuccess}
    />
  );
}
