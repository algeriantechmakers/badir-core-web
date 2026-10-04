"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Users,
  ArrowUpRight,
  Loader2,
  Circle,
} from "lucide-react";
import { AdminOrganizationCard, AdminService } from "@/services/admin";
import { AdminOrganizationStatusBadge } from "../AdminStatusBadge";
import SearchInput from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import {
  ORGANIZATION_TYPES,
  organizationTypeOptions,
  workAreaOptions,
} from "@/types/Profile";
import PaginationControls from "@/components/PaginationControls";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { updateOrganizationStatusAction } from "@/actions/admin";
import { toast } from "sonner";
import { useAdminOrganizations } from "@/hooks/useAdminOrganizations";

interface OrganizationsManagementProps {
  initialData: Awaited<ReturnType<typeof AdminService.getOrganizations>>;
  canManage?: boolean;
}

const OrganizationsManagement = ({
  initialData,
  canManage = true,
}: OrganizationsManagementProps) => {
  const {
    organizations,
    pagination,
    filters,
    isLoading,
    handlePageChange,
    handleFilterChange,
    setOrganizations,
  } = useAdminOrganizations(initialData);

  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizationCard | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const handleStatusUpdate = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
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
            prev.map((org) =>
              org.id === id ? { ...org, status: status } : org,
            ),
          );
          toast.success("تم تحديث حالة المنظمة بنجاح");
          setSelectedOrg((prev) =>
            prev && prev.id === id ? { ...prev, status: status } : prev,
          );
          setShowRejectionDialog(false);
          setShowDetailsDialog(false);
          setRejectionReason("");
        } else {
          toast.error(result.error || "حدث خطأ أثناء تحديث حالة المنظمة");
        }
      });
    } catch (error) {
      console.error("Error updating organization status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة المنظمة");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          إدارة المنظمات
        </h1>
        <p className="text-gray-600">مراجعة وموافقة على طلبات المنظمات</p>
      </div>

      <Card className="gap-2 border-none bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            المنظمات ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            {/* Filters */}
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
                onChange={(value) =>
                  handleFilterChange("organizationType", value)
                }
                options={[
                  ...organizationTypeOptions,
                  { value: "all", label: "جميع الأنواع" },
                ]}
                placeholder="النوع"
                className="w-40"
              />
            </div>
          </div>

          {/* Organizations List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : organizations.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  لا توجد منظمات
                </h3>
                <p className="text-gray-500">
                  لا توجد منظمات مطابقة للفلاتر المحددة
                </p>
              </div>
            ) : (
              organizations.map((org) => (
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
                        {org.shortName && (
                          <p className="text-sm text-gray-600">
                            {org.shortName}
                          </p>
                        )}
                        {org.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                            {org.description}
                          </p>
                        )}
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
                        <Badge
                          className={`flex items-center gap-1 text-xs ${org.owner.isActive ? "bg-secondary-100 text-primary-400" : "bg-neutrals-300 text-neutrals-600"}`}
                        >
                          <Circle
                            className={`h-2 w-2 fill-current ${
                              org.owner.isActive
                                ? "text-primary-400"
                                : "text-gray-600"
                            }`}
                          />
                          {org.owner.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {
                            ORGANIZATION_TYPES[
                              org.organizationType as keyof typeof ORGANIZATION_TYPES
                            ]
                          }
                        </Badge>
                        <Badge
                          className={`flex items-center gap-1 text-xs ${org.isVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                        >
                          {org.isVerified ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {org.isVerified ? "موثقة" : "غير موثقة"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {org._count.initiatives} مبادرة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">المالك:</span>{" "}
                        {org.owner.name}
                        <span className="text-gray-500">
                          {" "}
                          ({org.owner.email})
                        </span>
                        <div className="mt-1 text-xs text-gray-500">
                          انضم في {formatDate(org.createdAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <PaginationControls
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
              onPageChange={handlePageChange}
              className="mt-8"
            />
          )}
        </CardContent>
      </Card>

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

              {canManage && selectedOrg.status === "pending" && (
                <div className="flex justify-center gap-4 border-t pt-4">
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

              {(!canManage || selectedOrg.status !== "pending") && (
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

      {/* Rejection Dialog - Separate from Details Dialog */}
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
                  if (selectedOrg) {
                    handleStatusUpdate(selectedOrg.id, "rejected");
                  }
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

export default OrganizationsManagement;
