"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowUpLeft,
  ArrowUpRight,
  Calendar,
  Eye,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { AdminInitiativeCard } from "@/services/admin";
import FilterSelect from "@/components/FilterSelect";
import SearchInput from "@/components/SearchInput";
import Link from "next/link";
import AppButton from "@/components/AppButton";
import { InitiativeActions } from "../InitiativeActions";
import { useAdminInitiatives } from "@/hooks/useAdminInitiatives";
import { AdminInitiativeStatusBadge } from "../../AdminStatusBadge";

export const InitiativesTab = () => {
  const { initiatives, filters, isLoading, handleFilterChange, refetch } =
    useAdminInitiatives();

  const [selectedInitiative, setSelectedInitiative] =
    useState<AdminInitiativeCard | null>(null);

  const displayInitiatives = initiatives.slice(0, 3);

  return (
    <div className="space-y-6" dir="rtl">
      <Alert className="mt-6" dir="rtl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          هذه الصفحة تعرض فقط المبادرات المنشأة من قبل المستخدمين العاديين والتي
          تحتاج لموافقة المسؤول قبل النشر.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <div className="mt-6 mb-6 flex w-full items-end gap-4">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            placeholder="البحث عن مبادرة..."
            className="w-full"
          />
        </div>
        <FilterSelect
          value={filters.status}
          onChange={(value) => handleFilterChange("status", value)}
          options={[
            { value: "all", label: "جميع الحالات" },
            { value: "draft", label: "مسودة" },
            { value: "published", label: "منشورة" },
            { value: "cancelled", label: "ملغية" },
          ]}
          placeholder="الحالة"
          className="w-40 shrink-0"
        />
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-500" />
        ) : displayInitiatives.length > 0 ? (
          <>
            {displayInitiatives.map((initiative) => (
              <Card
                key={initiative.id}
                className="border-l-4 border-l-green-500"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/admin/initiatives/${initiative.id}`}
                        target="_blank"
                        className="flex items-center"
                      >
                        <ArrowUpRight className="ml-1 inline-block h-4 w-4 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900 hover:underline">
                          {initiative.titleAr}
                        </h3>
                      </Link>
                      {initiative.titleEn && (
                        <p className="text-sm text-gray-600">
                          {initiative.titleEn}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {initiative.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(initiative.startDate).toLocaleDateString(
                            "ar",
                          )}
                          {" - "}
                          {new Date(initiative.endDate).toLocaleDateString(
                            "ar",
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {initiative._count.participants} مشارك
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <AdminInitiativeStatusBadge status={initiative.status} />
                      <Badge variant="outline" className="text-xs">
                        {initiative.category.nameAr}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">المنظم:</span>{" "}
                      {initiative.organizerUser?.name || "غير محدد"} (
                      {initiative.organizerUser?.email || ""})
                    </div>
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInitiative(initiative)}
                          >
                            <Eye className="ml-1 h-4 w-4" />
                            عرض التفاصيل
                          </Button>
                        }
                      ></DialogTrigger>
                      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>تفاصيل المبادرة</DialogTitle>
                        </DialogHeader>
                        {selectedInitiative && (
                          <div className="space-y-4" dir="rtl">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="font-medium">
                                  عنوان المبادرة:
                                </label>
                                <p>{selectedInitiative.titleAr}</p>
                              </div>
                              <div>
                                <label className="font-medium">
                                  العنوان بالإنجليزية:
                                </label>
                                <p>
                                  {selectedInitiative.titleEn || "غير متوفر"}
                                </p>
                              </div>
                              <div>
                                <label className="font-medium">الفئة:</label>
                                <p>{selectedInitiative.category.nameAr}</p>
                              </div>
                              <div>
                                <label className="font-medium">المدينة:</label>
                                <p>{selectedInitiative.city}</p>
                              </div>
                              <div>
                                <label className="font-medium">
                                  تاريخ البدء:
                                </label>
                                <p>
                                  {new Date(
                                    selectedInitiative.startDate,
                                  ).toLocaleDateString("ar")}
                                </p>
                              </div>
                              <div>
                                <label className="font-medium">
                                  تاريخ الانتهاء:
                                </label>
                                <p>
                                  {new Date(
                                    selectedInitiative.endDate,
                                  ).toLocaleDateString("ar")}
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="font-medium">
                                معلومات المنظم:
                              </label>
                              <div className="mt-1 rounded bg-gray-50 p-3">
                                <p>
                                  <strong>الاسم:</strong>{" "}
                                  {selectedInitiative.organizerUser?.name ||
                                    "غير محدد"}
                                </p>
                                <p>
                                  <strong>البريد:</strong>{" "}
                                  {selectedInitiative.organizerUser?.email ||
                                    "غير محدد"}
                                </p>
                              </div>
                            </div>

                            <InitiativeActions
                              initiativeId={selectedInitiative.id}
                              currentStatus={selectedInitiative.status}
                              onStatusUpdate={refetch}
                            />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="w-full" dir="rtl">
              <AppButton
                type="outline"
                url="/admin/initiatives"
                className="mx-auto"
                border="square"
                icon={<ArrowUpLeft className="ml-1 h-4 w-4" />}
              >
                عرض المزيد
              </AppButton>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">لا توجد مبادرات لعرضها</p>
        )}
      </div>
    </div>
  );
};
