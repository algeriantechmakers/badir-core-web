"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  FileText,
  ImageIcon,
  Circle,
} from "lucide-react";
import { AdminService } from "@/services/admin";
import { formatDate } from "@/lib/utils";
import { AdminOrganizationStatusBadge } from "../AdminStatusBadge";
import {
  updateOrganizationStatusAction,
  updateOrgVerificationAction,
} from "@/actions/admin";
import { toast } from "sonner";
import { SwitchInput } from "@/components/form-input/index";
import { workAreaOptions } from "@/types/Profile";

interface OrganizationDetailsProps {
  organization: Awaited<ReturnType<typeof AdminService.getOrganizationById>>;
  canManage?: boolean;
}

const OrganizationDetails = ({
  organization,
  canManage = true,
}: OrganizationDetailsProps) => {
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isVerified, setIsVerified] = useState(
    Boolean(organization?.isVerified),
  );

  if (!organization) {
    return (
      <div className="mx-auto max-w-6xl p-6" dir="rtl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>المنظمة غير موجودة</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleStatusUpdate = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) {
      setShowRejectionForm(true);
      return;
    }

    try {
      startTransition(async () => {
        const result = await updateOrganizationStatusAction(
          organization.id,
          status,
          status === "rejected" ? rejectionReason : undefined,
        );

        if (result.success) {
          toast.success("تم تحديث حالة المنظمة بنجاح");
        } else {
          toast.error(result.error || "حدث خطأ أثناء تحديث حالة المنظمة");
        }
      });
    } catch (error) {
      console.error("Error updating organization status:", error);
    } finally {
      setShowRejectionForm(false);
      setRejectionReason("");
    }
  };

  const handleVerificationChange = async (
    checked: boolean | string | string[],
  ) => {
    if (!canManage || !organization) {
      return;
    }
    if (typeof checked !== "boolean") return;
    try {
      startTransition(async () => {
        const result = await updateOrgVerificationAction(
          organization.id,
          checked,
        );

        if (result.success) {
          setIsVerified(checked);
          toast.success(
            checked ? "تم توثيق المنظمة بنجاح" : "تم إلغاء توثيق المنظمة",
          );
        } else {
          toast.error(result.error || "حدث خطأ أثناء تحديث توثيق المنظمة");
        }
      });
    } catch (error) {
      console.error("Error updating organization verification:", error);
      toast.error("حدث خطأ أثناء تحديث توثيق المنظمة");
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" className="p-2">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {organization.name}
          </h1>
          <p className="text-gray-600">تفاصيل المنظمة</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <AdminOrganizationStatusBadge status={organization.status} />
          <Badge
            className={`flex items-center gap-1 text-xs ${organization.owner.isActive ? "bg-secondary-100 text-primary-400" : "bg-neutrals-300 text-neutrals-600"}`}
          >
            <Circle
              className={`h-2 w-2 fill-current ${
                organization.owner.isActive
                  ? "text-primary-400"
                  : "text-gray-600"
              }`}
            />
            {organization.owner.isActive
              ? "مالك المنظمة نشط"
              : "مالك المنظمة غير نشط"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                معلومات المنظمة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    اسم المنظمة
                  </Label>
                  <p className="mt-1 text-gray-900">{organization.name}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    الاسم المختصر
                  </Label>
                  <p className="mt-1 text-gray-900">
                    {organization.shortName || "غير متوفر"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    نوع المنظمة
                  </Label>
                  <p className="mt-1 text-gray-900">
                    {organization.organizationType}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    تاريخ التأسيس
                  </Label>
                  <p className="mt-1 text-gray-900">
                    {formatDate(organization.foundingDate!)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    عدد الأعضاء
                  </Label>
                  <p className="mt-1 text-gray-900">
                    {organization.membersCount || "غير محدد"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    المقر الرئيسي
                  </Label>
                  <p className="mt-1 text-gray-900">
                    {organization.headquarters || "غير متوفر"}
                  </p>
                </div>
              </div>

              {organization.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    وصف المنظمة
                  </Label>
                  <p className="mt-1 rounded-lg bg-gray-50 p-3 text-gray-900">
                    {organization.description}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  مجالات العمل
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {organization.workAreas.map((area, index) => (
                    <Badge key={index} variant="outline">
                      {workAreaOptions.find((option) => option.value === area)
                        ?.label || area}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التحقق من المنظمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    حالة التحقق
                  </Label>
                  <p className="mt-1 text-sm text-gray-500">
                    يتم التحقق من المنظمة من طرف المسؤول.
                  </p>
                </div>
                <SwitchInput
                  value={isVerified}
                  onChange={handleVerificationChange}
                  disabled={isPending || !canManage}
                  label="تبديل حالة توثيق المنظمة"
                  name="isVerified"
                  type={"switch"}
                  className="gap-0.5"
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge
                  className={`flex items-center gap-1 text-xs ${isVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
                >
                  {isVerified ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {isVerified ? "منظمة موثقة" : "غير موثقة"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات التواصل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      البريد الإلكتروني
                    </Label>
                    <p className="text-gray-900">{organization.contactEmail}</p>
                  </div>
                </div>

                {organization.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        رقم الهاتف
                      </Label>
                      <p className="text-gray-900" dir="ltr">
                        {organization.contactPhone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      الموقع
                    </Label>
                    <p className="text-gray-900">
                      {organization.city}, {organization.state},{" "}
                      {organization.country}
                    </p>
                  </div>
                </div>

                {organization.website && (
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        الموقع الإلكتروني
                      </Label>
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {organization.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات المالك</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      الاسم
                    </Label>
                    <p className="text-gray-900">{organization.owner.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      البريد الإلكتروني
                    </Label>
                    <p className="text-gray-900">{organization.owner.email}</p>
                  </div>
                </div>

                {organization.owner.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        رقم الهاتف
                      </Label>
                      <p className="text-gray-900" dir="ltr">
                        {organization.owner.phone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      تاريخ التسجيل
                    </Label>
                    <p className="text-gray-900">
                      {formatDate(organization.owner.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canManage && organization.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>إجراءات المراجعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {showRejectionForm ? (
                  <div className="space-y-3">
                    <Label htmlFor="rejectionReason">سبب الرفض</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="اكتب سبب رفض المنظمة..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleStatusUpdate("rejected")}
                        disabled={isPending || !rejectionReason.trim()}
                        variant="destructive"
                        size="sm"
                      >
                        تأكيد الرفض
                      </Button>
                      <Button
                        onClick={() => {
                          setShowRejectionForm(false);
                          setRejectionReason("");
                        }}
                        variant="outline"
                        size="sm"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate("approved")}
                      disabled={isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="ml-1 h-4 w-4" />
                      قبول المنظمة
                    </Button>
                    <Button
                      onClick={() => setShowRejectionForm(true)}
                      disabled={isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <XCircle className="ml-1 h-4 w-4" />
                      رفض المنظمة
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {!canManage && (
            <Alert>
              <AlertDescription>
                هذا العرض للقراءة فقط. لا يمكن تعديل حالة المنظمة من هذا الحساب.
              </AlertDescription>
            </Alert>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات المنظمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي المبادرات</span>
                <span className="font-medium">
                  {organization._count.initiatives}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">تاريخ التسجيل</span>
                <span className="font-medium">
                  {formatDate(organization.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Initiatives */}
          <Card>
            <CardHeader>
              <CardTitle>المبادرات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent>
              {organization.initiatives &&
              organization.initiatives.length > 0 ? (
                <div className="space-y-3">
                  {organization.initiatives.map((initiative) => (
                    <div
                      key={initiative.id}
                      className="border-b border-gray-100 pb-2 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {initiative.titleAr}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {initiative.status === "published"
                            ? "منشورة"
                            : initiative.status === "draft"
                              ? "مسودة"
                              : "ملغية"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(initiative.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  لا توجد مبادرات
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Documents Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            المستندات والصور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                شعار المنظمة
              </Label>
              {organization.logo ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-gray-50">
                  <Image
                    src={organization.logo}
                    alt="شعار المنظمة"
                    fill
                    className="object-contain p-2"
                  />
                  <Link
                    href={organization.logo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 left-2"
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed bg-gray-50">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">لا يوجد شعار</p>
                  </div>
                </div>
              )}
            </div>

            {/* Official License */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                الترخيص الرسمي
              </Label>
              {organization.officialLicense ? (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-gray-50 p-4">
                  <Link
                    href={organization.officialLicense}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-3 text-center"
                  >
                    <FileText className="text-primary-500 h-10 w-10" />
                    <span className="text-primary-500 text-sm font-medium">
                      فتح رابط الترخيص
                    </span>
                    <Button size="sm" variant="secondary">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed bg-gray-50">
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">لا يوجد ترخيص</p>
                  </div>
                </div>
              )}
            </div>

            {/* Identification Card */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                بطاقة الهوية
              </Label>
              {organization.identificationCard ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-gray-50">
                  <Image
                    src={organization.identificationCard}
                    alt="بطاقة الهوية"
                    fill
                    className="object-contain p-2"
                  />
                  <Link
                    href={organization.identificationCard}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 left-2"
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed bg-gray-50">
                  <div className="text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">لا توجد بطاقة</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {isPending && (
        <Alert className="fixed right-4 bottom-4 w-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>جاري تحديث حالة المنظمة...</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default OrganizationDetails;
