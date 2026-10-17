"use client";

import type React from "react";
import AdminActionDialog from "@/components/pages/admin/AdminActionDialog";
import { restoreOrganization } from "@/actions/admin";

interface RestoreOrgDialogProps {
  orgId: string;
  orgName: string;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function RestoreOrgDialog({
  orgId,
  orgName,
  trigger,
  onSuccess,
}: RestoreOrgDialogProps) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`استعادة المنظمة - ${orgName}`}
      description="سيتم إلغاء جدولة حذف المنظمة وإعادتها إلى الحالة النشطة."
      confirmLabel="استعادة"
      optionalMessage
      onConfirm={() => restoreOrganization(orgId)}
      onSuccess={onSuccess}
    />
  );
}
