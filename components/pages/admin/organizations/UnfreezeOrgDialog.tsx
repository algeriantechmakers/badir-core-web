import React from "react";
import AdminActionDialog from "../AdminActionDialog";
import { unfreezeOrganization } from "@/actions/admin";

export default function UnfreezeOrgDialog({
  trigger,
  orgName,
  orgId,
  onSuccess,
}: {
  trigger: React.ReactNode;
  orgName: string;
  orgId: string;
  onSuccess?: () => void;
}) {
  return (
    <AdminActionDialog
      trigger={trigger}
      title={`إلغاء تجميد المنظمة - ${orgName}`}
      description="سيتم إعادة تفعيل المنظمة."
      confirmLabel="إلغاء التجميد"
      destructive={false}
      onConfirm={async (message) => {
        const result = await unfreezeOrganization(orgId, message);
        if (!result.success) throw new Error("تعذّر إلغاء التجميد");
        onSuccess?.();
      }}
      optionalMessage={true}
    />
  );
}
