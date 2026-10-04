"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Users,
  XCircle,
} from "lucide-react";
import { AdminOrganizationCard } from "@/services/admin";
import { AdminOrganizationStatusBadge } from "../../AdminStatusBadge";
import FilterSelect from "@/components/FilterSelect";
import SearchInput from "@/components/SearchInput";
import { organizationTypeOptions, workAreaOptions } from "@/types/Profile";
import { toast } from "sonner";
import Link from "next/link";
import AppButton from "@/components/AppButton";
import { useAdminOrganizations } from "@/hooks/useAdminOrganizations";
import { updateOrganizationStatusAction } from "@/actions/admin";
import { formatDate } from "@/lib/utils";

interface OrganizationsTabProps {
  canManageOrganizations: boolean;
}

export const OrganizationsTab = ({
  canManageOrganizations,
}: OrganizationsTabProps) => {
  const {
    organizations,
    filters,
    isLoading,
    handleFilterChange,
    setOrganizations,
  } = useAdminOrganizations();

  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizationCard | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const displayOrganizations = organizations.slice(0, 3);

  const handleStatusUpdate = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    if (!canManageOrganizations) {
      toast.error("غير مصرح لك بتحديث حالة المنظمة");
      return;
    }
    if (status === "rejected" && !rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }

    try {
      startTransition(async () => {
        const result = await updateOrganizationStatusAction(
          id,
          status,
          status === "rejected" ? rejectionReason : undefined,
        );

        if (result.success) {
          setOrganizations((prev) =>
            prev.map((org) => (org.id === id ? { ...org, status } : org)),
          );
          setSelectedOrg((prev) =>
            prev?.id === id ? { ...prev, status } : prev,
          );
          toast.success("تم تحديث حالة المنظمة بنجاح");
          setShowDetailsDialog(false);
          setShowRejectionDialog(false);
          setRejectionReason("");
        } else {
          toast.error(result.error || "حدث خطأ أثناء تحديث حالة المنظمة");
        }
      });
    } catch {
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Filters */}
      <div className="mt-6 mb-6 flex w-full items-end gap-4">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            placeholder="البحث عن منظمة..."
            className="w-full"
          />
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-4" dir="rtl">
          <FilterSelect
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={[
              { value: "all", label: "جميع الحالات" },
              { value: "pending", label: "قيد المراجعة" },
              { value: "approved", label: "مقبولة" },
              { value: "rejected", label: "مرفوضة" },
            ]}
            placeholder="الحالة"
            className="w-40"
          />
          <FilterSelect
            value={filters.organizationType}
            onChange={(value) => handleFilterChange("organizationType", value)}
            options={[
              ...organizationTypeOptions,
              { value: "all", label: "جميع الأنواع" },
            ]}
            placeholder="النوع"
            className="w-40"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-500" />
        ) : displayOrganizations.length > 0 ? (
          <>
            {displayOrganizations.map((org) => (
              <Card key={org.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        target="_blank"
                        className="flex items-center"
                      >
                        <ArrowUpRight className="ml-1 inline-block h-4 w-4 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900 hover:underline">
                          {org.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600">{org.shortName}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {org.contactEmail}
                        </span>
                        {org.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span dir="ltr">{org.contactPhone}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {org.city}, {org.country}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <AdminOrganizationStatusBadge status={org.status} />
                      <span className="text-sm text-gray-500">
                        {org._count.initiatives} مبادرة
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">المالك:</span>{" "}
                      {org.owner.name} ({org.owner.email})
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrg(org);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="ml-1 h-4 w-4" />
                      عرض التفاصيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="w-full" dir="rtl">
              <AppButton
                type="outline"
                url="/admin/organizations"
                className="mx-auto"
                border="default"
                icon={<ArrowUpLeft className="ml-1 h-4 w-4" />}
              >
                عرض المزيد
              </AppButton>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">لا توجد منظمات لعرضها</p>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المنظمة - {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              عرض كامل المعلومات والتفاصيل الخاصة بالمنظمة
            </DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-6" dir="rtl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium text-gray-700">
                    اسم المنظمة:
                  </Label>
                  <p className="mt-1">{selectedOrg.name}</p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">
                    الاسم المختصر:
                  </Label>
                  <p className="mt-1">{selectedOrg.shortName || "غير متوفر"}</p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">
                    نوع المنظمة:
                  </Label>
                  <p className="mt-1">{selectedOrg.organizationType}</p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">
                    عدد الأعضاء:
                  </Label>
                  <p className="mt-1">
                    {selectedOrg.membersCount || "غير محدد"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">
                    تاريخ التأسيس:
                  </Label>
                  <p className="mt-1">
                    {selectedOrg.foundingDate
                      ? formatDate(selectedOrg.foundingDate)
                      : "غير متوفر"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">
                    المقر الرئيسي:
                  </Label>
                  <p className="mt-1">
                    {selectedOrg.headquarters || "غير متوفر"}
                  </p>
                </div>
              </div>

              {selectedOrg.description && (
                <div>
                  <Label className="font-medium text-gray-700">
                    وصف المنظمة:
                  </Label>
                  <p className="mt-1 rounded-lg bg-gray-50 p-3">
                    {selectedOrg.description}
                  </p>
                </div>
              )}

              <div>
                <Label className="font-medium text-gray-700">
                  مجالات العمل:
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedOrg.workAreas.map((area, index) => (
                    <Badge key={index} variant="outline">
                      {workAreaOptions.find((option) => option.value === area)
                        ?.label || area}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <Label className="mb-3 block font-medium text-gray-700">
                  معلومات التواصل:
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedOrg.contactEmail}</span>
                  </div>
                  {selectedOrg.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm" dir="ltr">
                        {selectedOrg.contactPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedOrg.city}, {selectedOrg.state},{" "}
                      {selectedOrg.country}
                    </span>
                  </div>
                  {selectedOrg.website && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🌐</span>
                      <a
                        href={selectedOrg.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedOrg.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <Label className="mb-3 block font-medium text-gray-700">
                  معلومات المالك:
                </Label>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <strong>الاسم:</strong> {selectedOrg.owner.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <strong>البريد:</strong> {selectedOrg.owner.email}
                  </p>
                  {selectedOrg.owner.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <strong>الهاتف:</strong>{" "}
                      <span dir="ltr">{selectedOrg.owner.phone}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <strong>تاريخ التسجيل:</strong>{" "}
                    {formatDate(selectedOrg.createdAt)}
                  </p>
                </div>
              </div>

              {canManageOrganizations && selectedOrg.status === "pending" && (
                <div className="flex justify-center gap-4 pt-4">
                  <Button
                    onClick={() =>
                      handleStatusUpdate(selectedOrg.id, "approved")
                    }
                    disabled={isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="ml-1 h-4 w-4" />
                    قبول المنظمة
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      setShowRejectionDialog(true);
                    }}
                    disabled={isPending}
                    variant="destructive"
                  >
                    <XCircle className="ml-1 h-4 w-4" />
                    رفض المنظمة
                  </Button>
                </div>
              )}

              {selectedOrg.status !== "pending" && (
                <div className="border-t py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <AdminOrganizationStatusBadge status={selectedOrg.status} />
                    <span className="text-sm text-gray-600">
                      تم التحديث في {formatDate(selectedOrg.updatedAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض المنظمة - {selectedOrg?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                سبب رفض المنظمة <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض المنظمة..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowRejectionDialog(false);
                  setRejectionReason("");
                }}
                variant="outline"
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrg)
                    handleStatusUpdate(selectedOrg.id, "rejected");
                }}
                disabled={isPending || !rejectionReason.trim()}
                variant="destructive"
              >
                {isPending ? "جاري الرفض..." : "تأكيد الرفض"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
