"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tag, Edit, Trash2, Calendar, Loader2 } from "lucide-react";
import { InitiativeCategory } from "@prisma/client";
import {
  listInitiativeCategoriesAction,
  createInitiativeCategoryAction,
  updateInitiativeCategoryAction,
  deleteInitiativeCategoryAction,
} from "@/actions/admin";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import AppButton from "@/components/AppButton";
import Image from "next/image";
import ColorPicker from "@/components/color-picker";
import FormInput from "@/components/form-input";
import { categorySchema, CategoryFormData } from "@/schemas/categorySchema";

const CategoriesManagement = () => {
  const [categories, setCategories] = useState<InitiativeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<InitiativeCategory | null>(null);

  // React Hook Form for Create Dialog
  const createForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      bgColor: "#3B82F6",
      textColor: "#FFFFFF",
      isActive: true,
    } as CategoryFormData,
  });

  // React Hook Form for Edit Dialog
  const editForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      bgColor: "#3B82F6",
      textColor: "#FFFFFF",
      isActive: true,
    } as CategoryFormData,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const result = await listInitiativeCategoriesAction();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        toast.error(result.error || "حدث خطأ أثناء جلب الفئات");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("حدث خطأ أثناء جلب الفئات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    createForm.reset({
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      bgColor: "#3B82F6",
      textColor: "#FFFFFF",
      isActive: true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (category: InitiativeCategory) => {
    setSelectedCategory(category);
    editForm.reset({
      nameAr: category.nameAr,
      nameEn: category.nameEn || "",
      descriptionAr: category.descriptionAr || "",
      descriptionEn: category.descriptionEn || "",
      bgColor: category.bgColor || "#3B82F6",
      textColor: category.textColor || "#FFFFFF",
      isActive: category.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (category: InitiativeCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = async (data: CategoryFormData) => {
    startTransition(async () => {
      const result = await createInitiativeCategoryAction(data);

      if (result.success) {
        toast.success("تم إنشاء الفئة بنجاح");
        setIsCreateDialogOpen(false);
        createForm.reset();
        fetchCategories();
      } else {
        toast.error(result.error || "حدث خطأ أثناء إنشاء الفئة");
      }
    });
  };

  const handleSubmitEdit = async (data: CategoryFormData) => {
    if (!selectedCategory) return;

    startTransition(async () => {
      const result = await updateInitiativeCategoryAction(
        selectedCategory.id,
        data,
      );

      if (result.success) {
        toast.success("تم تحديث الفئة بنجاح");
        setIsEditDialogOpen(false);
        editForm.reset();
        fetchCategories();
      } else {
        toast.error(result.error || "حدث خطأ أثناء تحديث الفئة");
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;

    startTransition(async () => {
      const result = await deleteInitiativeCategoryAction(selectedCategory.id);

      if (result.success) {
        toast.success("تم حذف الفئة بنجاح");
        setIsDeleteDialogOpen(false);
        fetchCategories();
      } else {
        toast.error(result.error || "حدث خطأ أثناء حذف الفئة");
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            إدارة فئات المبادرات
          </h1>
          <p className="text-gray-600">
            إضافة وتعديل وحذف فئات المبادرات المتاحة
          </p>
        </div>
        <AppButton
          type="primary"
          onClick={handleCreate}
          className="gap-2"
          icon={
            <Image
              src="/images/icons/plus.svg"
              alt="Plus"
              width={16}
              height={16}
            />
          }
        >
          إضافة فئة جديدة
        </AppButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            الفئات ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                لا توجد فئات
              </h3>
              <p className="text-gray-500">
                قم بإضافة فئة جديدة للمبادرات باستخدام الزر أعلاه
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المعاينة</TableHead>
                  <TableHead className="text-right">الاسم بالعربية</TableHead>
                  <TableHead className="text-right">
                    الاسم بالإنجليزية
                  </TableHead>
                  <TableHead className="text-right">الألوان</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: category.bgColor || "#3B82F6",
                          color: category.textColor || "#FFFFFF",
                        }}
                      >
                        {category.nameAr}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{category.nameAr}</div>
                        {category.descriptionAr && (
                          <div className="line-clamp-1 text-sm text-gray-500">
                            {category.descriptionAr}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.nameEn ? (
                        <div>
                          <div>{category.nameEn}</div>
                          {category.descriptionEn && (
                            <div className="line-clamp-1 text-sm text-gray-500">
                              {category.descriptionEn}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">غير متوفر</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border"
                          style={{
                            backgroundColor: category.bgColor || "#3B82F6",
                          }}
                          title={`خلفية: ${category.bgColor || "#3B82F6"}`}
                        />
                        <div
                          className="h-6 w-6 rounded border"
                          style={{
                            backgroundColor: category.textColor || "#FFFFFF",
                          }}
                          title={`نص: ${category.textColor || "#FFFFFF"}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className={cn(
                          category.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800",
                        )}
                      >
                        {category.isActive ? "نشطة" : "غير نشطة"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(category.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          disabled={isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة فئة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleSubmitCreate)}>
            <div className="space-y-4" dir="rtl">
              {/* Arabic Name */}
              <Controller
                name="nameAr"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="text"
                    label="الاسم بالعربية"
                    name="create-nameAr"
                    placeholder="أدخل اسم الفئة بالعربية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={false}
                  />
                )}
              />

              {/* English Name */}
              <Controller
                name="nameEn"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="text"
                    label="الاسم بالإنجليزية"
                    name="create-nameEn"
                    placeholder="أدخل اسم الفئة بالإنجليزية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                  />
                )}
              />

              {/* Arabic Description */}
              <Controller
                name="descriptionAr"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="textarea"
                    label="الوصف بالعربية"
                    name="create-descriptionAr"
                    placeholder="أدخل وصف الفئة بالعربية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                    rows={3}
                  />
                )}
              />

              {/* English Description */}
              <Controller
                name="descriptionEn"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="textarea"
                    label="الوصف بالإنجليزية"
                    name="create-descriptionEn"
                    placeholder="أدخل وصف الفئة بالإنجليزية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                    rows={3}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Background Color */}
                <div className="space-y-2">
                  <Controller
                    name="bgColor"
                    control={createForm.control}
                    render={({ field, fieldState }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="لون الخلفية"
                        disabled={isPending}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Controller
                    name="textColor"
                    control={createForm.control}
                    render={({ field, fieldState }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="لون النص"
                        disabled={isPending}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Is Active */}
              <Controller
                name="isActive"
                control={createForm.control}
                render={({ field }) => (
                  <FormInput
                    type="switch"
                    label="حالة الفئة"
                    name="create-isActive"
                    placeholder="فعّل أو عطّل إظهار هذه الفئة"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                )}
              />

              {/* Preview Badge */}
              <div className="space-y-2">
                <Label>معاينة الشارة</Label>
                <div className="flex items-center gap-2 rounded-lg border p-4">
                  <Badge
                    style={{
                      backgroundColor: createForm.watch("bgColor") || "#3B82F6",
                      color: createForm.watch("textColor") || "#FFFFFF",
                    }}
                    className="text-sm"
                  >
                    {createForm.watch("nameAr") || "اسم الفئة"}
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <AppButton
                type="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isPending}
                size="sm"
                border="square"
              >
                إلغاء
              </AppButton>
              <AppButton
                type="primary"
                border="square"
                size="sm"
                disabled={isPending}
                icon={
                  isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : null
                }
                onClick={createForm.handleSubmit(handleSubmitCreate)}
              >
                {isPending ? <>جاري الإنشاء...</> : "إنشاء الفئة"}
              </AppButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الفئة</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleSubmitEdit)}>
            <div className="space-y-4" dir="rtl">
              {/* Arabic Name */}
              <Controller
                name="nameAr"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="text"
                    label="الاسم بالعربية"
                    name="edit-nameAr"
                    placeholder="أدخل اسم الفئة بالعربية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={false}
                  />
                )}
              />

              {/* English Name */}
              <Controller
                name="nameEn"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="text"
                    label="الاسم بالإنجليزية"
                    name="edit-nameEn"
                    placeholder="أدخل اسم الفئة بالإنجليزية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                  />
                )}
              />

              {/* Arabic Description */}
              <Controller
                name="descriptionAr"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="textarea"
                    label="الوصف بالعربية"
                    name="edit-descriptionAr"
                    placeholder="أدخل وصف الفئة بالعربية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                    rows={3}
                  />
                )}
              />

              {/* English Description */}
              <Controller
                name="descriptionEn"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <FormInput
                    type="textarea"
                    label="الوصف بالإنجليزية"
                    name="edit-descriptionEn"
                    placeholder="أدخل وصف الفئة بالإنجليزية"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    disabled={isPending}
                    isOptional={true}
                    rows={3}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Background Color */}
                <div className="space-y-2">
                  <Controller
                    name="bgColor"
                    control={editForm.control}
                    render={({ field, fieldState }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="لون الخلفية"
                        disabled={isPending}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Controller
                    name="textColor"
                    control={editForm.control}
                    render={({ field, fieldState }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="لون النص"
                        disabled={isPending}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Is Active */}
              <Controller
                name="isActive"
                control={editForm.control}
                render={({ field }) => (
                  <FormInput
                    type="switch"
                    label="حالة الفئة"
                    name="edit-isActive"
                    placeholder="فعّل أو عطّل إظهار هذه الفئة"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isPending}
                  />
                )}
              />

              {/* Preview Badge */}
              <div className="space-y-2">
                <Label>معاينة الشارة</Label>
                <div className="flex items-center gap-2 rounded-lg border p-4">
                  <Badge
                    style={{
                      backgroundColor: editForm.watch("bgColor") || "#3B82F6",
                      color: editForm.watch("textColor") || "#FFFFFF",
                    }}
                    className="text-sm"
                  >
                    {editForm.watch("nameAr") || "اسم الفئة"}
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <AppButton
                type="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isPending}
                border="square"
                size="sm"
              >
                إلغاء
              </AppButton>
              <AppButton
                type="primary"
                disabled={isPending}
                border="square"
                size="sm"
                icon={
                  isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : null
                }
                onClick={editForm.handleSubmit(handleSubmitEdit)}
              >
                {isPending ? <>جاري التحديث...</> : "حفظ التغييرات"}
              </AppButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription dir="rtl">
              هل أنت متأكد من حذف الفئة &quot;{selectedCategory?.nameAr}&quot;؟
              لن تتمكن من التراجع عن هذا الإجراء. لاحظ أنه لا يمكن حذف الفئات
              المرتبطة بمبادرات موجودة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "حذف الفئة"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesManagement;
