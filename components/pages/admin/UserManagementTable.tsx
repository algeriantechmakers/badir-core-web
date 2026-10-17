"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Circle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminService, AdminUserCard } from "@/services/admin";
import { assignManager, revokeManager } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationControls from "@/components/PaginationControls";
import { formatDate } from "@/lib/utils";
import FilterSelect from "@/components/FilterSelect";
import { UserRole } from "@prisma/client";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import FreezeUserDialog from "@/components/pages/admin/users/FreezeUserDialog";
import RemoveUserDialog from "@/components/pages/admin/users/RemoveUserDialog";
import RestoreUserDialog from "@/components/pages/admin/users/RestoreUserDialog";
import Link from "next/link";

interface UserManagementTableProps {
  initialData: Awaited<ReturnType<typeof AdminService.getUsers>>;
  viewerRole: UserRole;
  inDashaboard?: boolean;
}

const roleLabels = {
  USER: "USER",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const;

function roleBadgeVariant(role: AdminUserCard["role"]) {
  if (role === "ADMIN") return "default";
  if (role === "MANAGER") return "secondary";
  return "outline";
}

export default function UserManagementTable({
  initialData,
  viewerRole,
  inDashaboard = false,
}: UserManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const {
    searchValue,
    setSearchValue,
    currentRole,
    handleRoleChange,
    handlePageChange,
  } = useAdminUsers();

  const handleAssign = (user: AdminUserCard) => {
    setPendingUserId(user.id);
    startTransition(() => {
      void (async () => {
        try {
          const result = await assignManager(user.id);

          if (result.success) {
            toast.success(result.message || "تم تحديث دور المستخدم بنجاح");
            router.refresh();
          } else {
            toast.error(result.error || "حدث خطأ أثناء تحديث الدور");
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تحديث الدور",
          );
        } finally {
          setPendingUserId(null);
        }
      })();
    });
  };

  const handleRevoke = (user: AdminUserCard) => {
    setPendingUserId(user.id);
    startTransition(() => {
      void (async () => {
        try {
          const result = await revokeManager(user.id);

          if (result.success) {
            toast.success(result.message || "تم تحديث دور المستخدم بنجاح");
            router.refresh();
          } else {
            toast.error(result.error || "حدث خطأ أثناء تحديث الدور");
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تحديث الدور",
          );
        } finally {
          setPendingUserId(null);
        }
      })();
    });
  };

  const users = initialData.data;
  const pagination = initialData.pagination;
  const canManageManagers = viewerRole === "ADMIN";
  const canModerateUsers = viewerRole === "ADMIN" || viewerRole === "MANAGER";

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      {!inDashaboard && (
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            إدارة المستخدمين
          </h1>
          <p className="text-gray-600">
            تعيين وإلغاء صلاحيات المدير للمستخدمين
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_240px] lg:items-end">
          <div className="relative">
            <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="البحث بالاسم أو البريد الإلكتروني"
              className="h-9 rounded-xl border-gray-200 bg-white pr-10 pl-4"
            />
          </div>

          <FilterSelect
            value={currentRole}
            onChange={handleRoleChange}
            options={[
              { value: "all", label: "كل الأدوار" },
              { value: "USER", label: "مستخدم" },
              { value: "MANAGER", label: "مدير" },
              { value: "ADMIN", label: "مسؤول" },
            ]}
            placeholder="جميع الأدوار"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded border border-gray-200 bg-white px-2 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">الاسم</TableHead>
              <TableHead className="w-1/4">البريد الإلكتروني</TableHead>
              <TableHead className="w-32">الدور</TableHead>
              <TableHead className="w-28">الحالة</TableHead>
              <TableHead className="w-44">تاريخ الانضمام</TableHead>
              <TableHead className="text-start">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-gray-500"
                >
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isRowPending = pendingUserId === user.id;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-gray-900">
                      <Link
                        href={`/profile/${user.id}`}
                        target="_blank"
                        className="flex items-center gap-0.5 hover:underline"
                      >
                        <ArrowUpRight className="ml-1 inline-block h-4 w-4 text-gray-500" />
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`flex items-center gap-1 text-xs ${user.isActive ? "bg-secondary-100 text-primary-400" : "bg-neutrals-300 text-neutrals-600"}`}
                      >
                        <Circle
                          className={`h-2 w-2 fill-current ${
                            user.isActive ? "text-primary-400" : "text-gray-600"
                          }`}
                        />
                        {user.scheduledDeletionAt
                          ? "مجدول للحذف"
                          : user.isActive
                            ? "نشط"
                            : "مجمد"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {canManageManagers && user.role === "USER" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || isRowPending}
                            onClick={() => handleAssign(user)}
                          >
                            {isRowPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "ترقية إلى مدير"
                            )}
                          </Button>
                        )}

                        {canManageManagers && user.role === "MANAGER" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending || isRowPending}
                            onClick={() => handleRevoke(user)}
                          >
                            {isRowPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "إلغاء صلاحية المدير"
                            )}
                          </Button>
                        )}

                        {canModerateUsers && (
                          <>
                            {user.scheduledDeletionAt && (
                              <RestoreUserDialog
                                userId={user.id}
                                userName={user.name}
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                  >
                                    استعادة الحساب
                                  </Button>
                                }
                              />
                            )}
                            <FreezeUserDialog
                              userId={user.id}
                              userName={user.name}
                              isFrozen={!user.isActive}
                              trigger={
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending || isRowPending}
                                >
                                  {user.isActive
                                    ? "تجميد الحساب"
                                    : "إلغاء التجميد"}
                                </Button>
                              }
                            />
                            {!user.scheduledDeletionAt && (
                              <RemoveUserDialog
                                userId={user.id}
                                userName={user.name}
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={isPending || isRowPending}
                                  >
                                    حذف الحساب
                                  </Button>
                                }
                              />
                            )}
                          </>
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

      <div className="mt-6 flex flex-col gap-4">
        <div className="text-sm text-gray-600">
          إجمالي المستخدمين:{" "}
          <span className="font-medium text-gray-900">{pagination.total}</span>
        </div>
        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
