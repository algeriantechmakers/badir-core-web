"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, StarOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toggleFeaturedPartnerAction } from "@/actions/admin";
import PaginationControls from "@/components/PaginationControls";
import { PaginatedResponse } from "@/types/Pagination";
import AppButton from "@/components/AppButton";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  logo: string | null;
  isFeaturedPartner: boolean;
}

interface PartnersManagementProps {
  initialData: PaginatedResponse<Organization>;
  currentPage: number;
}

export default function PartnersManagement({
  initialData,
  currentPage,
}: PartnersManagementProps) {
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.SubmitEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    params.set("page", "1");
    window.location.href = `/admin/partners?${params.toString()}`;
  };

  const handleTogglePartner = async (
    organizationId: string,
    isFeatured: boolean,
  ) => {
    startTransition(async () => {
      try {
        const result = await toggleFeaturedPartnerAction(
          organizationId,
          !isFeatured,
        );

        if (result.success) {
          toast.success(result.message);
          // Update local state
          setData((prev) => ({
            ...prev,
            data: prev.data.map((org) =>
              org.id === organizationId
                ? { ...org, isFeaturedPartner: !isFeatured }
                : org,
            ),
          }));
        } else {
          toast.error(result.error || "حدث خطأ أثناء التحديث");
        }
      } catch (error) {
        console.error("Error toggling partner:", error);
        toast.error("حدث خطأ أثناء تحديث الشريك");
      }
    });
  };

  const featuredCount = data.data.filter((org) => org.isFeaturedPartner).length;

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الشركاء</h1>
          <p className="text-muted-foreground mt-2">
            اختر الشركاء المميزين للظهور في الصفحة الرئيسية (الحد الأقصى: 5)
          </p>
        </div>
        <Badge variant="secondary" className="text-lg">
          {featuredCount} / 5 شركاء مميزين
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المنظمات المعتمدة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ابحث عن منظمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <AppButton size="sm" border="default" type="submit">
                بحث
              </AppButton>
            </div>
          </form>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشعار</TableHead>
                  <TableHead className="text-right">اسم المنظمة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      لا توجد منظمات معتمدة
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        {org.logo ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-md">
                            <Image
                              src={org.logo}
                              alt={org.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200">
                            <span className="text-xl font-bold text-gray-400">
                              {org.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/organizations/${org.id}`}
                          className="hover:text-primary font-medium hover:underline"
                          target="_blank"
                        >
                          {org.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {org.isFeaturedPartner ? (
                          <Badge className="text-primary-400 bg-primary-100 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            شريك مميز
                          </Badge>
                        ) : (
                          <Badge variant="outline">غير مميز</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={
                            org.isFeaturedPartner ? "destructive" : "default"
                          }
                          size="sm"
                          onClick={() =>
                            handleTogglePartner(org.id, org.isFeaturedPartner)
                          }
                          disabled={
                            isPending ||
                            (!org.isFeaturedPartner && featuredCount >= 5)
                          }
                          className={cn(
                            "gap-2",
                            !org.isFeaturedPartner &&
                              "bg-primary-500 hover:bg-primary-400 text-white",
                          )}
                        >
                          {org.isFeaturedPartner ? (
                            <>
                              <StarOff className="h-4 w-4" />
                              إزالة
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4" />
                              إضافة كشريك
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={data.pagination.totalPages}
                hasNext={data.pagination.hasNext}
                hasPrev={data.pagination.hasPrev}
                onPageChange={(page) => {
                  const params = new URLSearchParams();
                  if (searchQuery) params.set("search", searchQuery);
                  params.set("page", page.toString());
                  window.location.href = `/admin/partners?${params.toString()}`;
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
