"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportStatus, ReportTarget } from "@prisma/client";
import { toast } from "sonner";
import { dismissReport, resolveReport } from "@/actions/admin";
import type { ReportWithDetails } from "@/services/reports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterSelect from "@/components/FilterSelect";
import RemovePostDialog from "./RemovePostDialog";
import FreezeUserDialog from "@/components/pages/admin/users/FreezeUserDialog";
import RemoveUserDialog from "@/components/pages/admin/users/RemoveUserDialog";
import FreezeOrgDialog from "@/components/pages/admin/organizations/FreezeOrgDialog";
import RemoveOrgDialog from "@/components/pages/admin/organizations/RemoveOrgDialog";
import { REPORT_REASONS } from "@/types/Statics";

const statusLabels: Record<ReportStatus, string> = {
  PENDING: "قيد المراجعة",
  RESOLVED: "تم الحل",
  DISMISSED: "مرفوض",
};

export default function ReportsTable({
  reports,
  isAdmin,
  isManager,
}: {
  reports: ReportWithDetails[];
  isAdmin: boolean;
  isManager: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReportStatus | "ALL">("ALL");
  const [targetType, setTargetType] = useState<ReportTarget | "ALL">("ALL");
  const filtered = useMemo(
    () =>
      reports.filter(
        (report) =>
          (status === "ALL" || report.status === status) &&
          (targetType === "ALL" || report.targetType === targetType),
      ),
    [reports, status, targetType],
  );
  const refresh = () => router.refresh();
  const resolveAndRefresh = async (reportId: string) => {
    const result = await resolveReport(reportId);
    if (!result.actionTaken) {
      toast.error(result.error || "تعذر تحديث البلاغ");
      return;
    }
    refresh();
  };

  const dismiss = async (id: string) => {
    const result = await dismissReport(id);
    if (result.actionTaken) refresh();
    else toast.error(result.error || "تعذر رفض البلاغ");
  };

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">البلاغات</h1>
        <p className="text-gray-600">إدارة التقارير</p>
      </div>
      <div className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="grid grid-cols-[auto_auto] gap-4 md:grid-cols-2">
            <FilterSelect
              value={status}
              onChange={(value) => setStatus(value as ReportStatus | "ALL")}
              options={[
                { value: "ALL", label: "كل الحالات" },
                ...Object.values(ReportStatus).map((value) => ({
                  value,
                  label: statusLabels[value],
                })),
              ]}
              placeholder="الحالة"
            />
            <FilterSelect
              value={targetType}
              onChange={(value) => setTargetType(value as ReportTarget | "ALL")}
              options={[
                { value: "ALL", label: "كل الأنواع" },
                { value: "USER", label: "مستخدم" },
                { value: "ORGANIZATION", label: "منظمة" },
                { value: "POST", label: "منشور" },
              ]}
              placeholder="نوع الهدف"
            />
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded border border-gray-200 bg-white px-2 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>الهدف</TableHead>
              <TableHead>المبلّغ</TableHead>
              <TableHead>السبب</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-start">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered || filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-10 text-center">
                  لا توجد بلاغات
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((report) => {
                const canRemovePost =
                  isAdmin || (isManager && !!report.organizerOrgId);
                const targetName = report.targetName;
                const actionTrigger = (
                  <Button size="sm" variant="destructive">
                    إجراء
                  </Button>
                );
                return (
                  <TableRow key={report.id}>
                    <TableCell>{report.targetType}</TableCell>
                    <TableCell className="font-medium">{targetName}</TableCell>
                    <TableCell>
                      {report.reporter.name ||
                        `${report.reporter.firstName} ${report.reporter.lastName}`}
                    </TableCell>
                    <TableCell>
                      {report.reason === "OTHER"
                        ? report.customReason
                        : REPORT_REASONS.find((r) => r.value === report.reason)
                            ?.label || report.reason}
                    </TableCell>
                    <TableCell>
                      {new Date(report.createdAt).toLocaleDateString("ar-DZ")}
                    </TableCell>
                    <TableCell>
                      <Badge>{statusLabels[report.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {report.status === ReportStatus.PENDING &&
                          (isAdmin || isManager) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => dismiss(report.id)}
                              >
                                رفض
                              </Button>
                              {report.targetType === ReportTarget.USER &&
                                report.targetOwnerId && (
                                  <>
                                    <FreezeUserDialog
                                      userId={report.targetId}
                                      userName={targetName}
                                      trigger={actionTrigger}
                                      onSuccess={() =>
                                        resolveAndRefresh(report.id)
                                      }
                                    />
                                    <RemoveUserDialog
                                      userId={report.targetId}
                                      userName={targetName}
                                      trigger={
                                        <Button size="sm" variant="destructive">
                                          حذف
                                        </Button>
                                      }
                                      onSuccess={() =>
                                        resolveAndRefresh(report.id)
                                      }
                                    />
                                  </>
                                )}
                              {report.targetType ===
                                ReportTarget.ORGANIZATION && (
                                <>
                                  <FreezeOrgDialog
                                    orgId={report.targetId}
                                    orgName={targetName}
                                    isFrozen={false}
                                    trigger={actionTrigger}
                                    onSuccess={() =>
                                      resolveAndRefresh(report.id)
                                    }
                                  />
                                  <RemoveOrgDialog
                                    orgId={report.targetId}
                                    orgName={targetName}
                                    trigger={
                                      <Button size="sm" variant="destructive">
                                        حذف
                                      </Button>
                                    }
                                    onSuccess={() =>
                                      resolveAndRefresh(report.id)
                                    }
                                  />
                                </>
                              )}
                              {report.targetType === ReportTarget.POST &&
                                canRemovePost && (
                                  <RemovePostDialog
                                    postId={report.targetId}
                                    postTitle={targetName}
                                    trigger={actionTrigger}
                                    onSuccess={() =>
                                      resolveAndRefresh(report.id)
                                    }
                                  />
                                )}
                              {report.targetType === ReportTarget.POST &&
                                !canRemovePost && (
                                  <Button
                                    size="sm"
                                    disabled
                                    title="لا يمكن للمدير إزالة منشور من مبادرة فردية"
                                  >
                                    إجراء
                                  </Button>
                                )}
                            </>
                          )}
                        {report.status !== ReportStatus.PENDING && (
                          <span className="text-muted-foreground">
                            لا توجد إجراءات
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
