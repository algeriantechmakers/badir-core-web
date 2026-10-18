"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, Save, Send, X } from "lucide-react";
import RichTextEditor, { BaseKit, useEditorState } from "reactjs-tiptap-editor";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Bold } from "reactjs-tiptap-editor/bold";
import { Italic } from "reactjs-tiptap-editor/italic";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { OrderedList } from "reactjs-tiptap-editor/orderedlist";
import { Link } from "reactjs-tiptap-editor/link";
import { Color } from "reactjs-tiptap-editor/color";
import { BubbleMenuDrawer } from "reactjs-tiptap-editor/bubble-extra";
import { SlashCommand } from "reactjs-tiptap-editor/slashcommand";
import { ColumnActionButton } from "reactjs-tiptap-editor/multicolumn";
import { createPostAction, updatePostAction } from "@/actions/posts";
import { PostType, PostStatus } from "@prisma/client";
import { toast } from "sonner";
import FormInput, { SelectInput } from "./form-input";
import { BUCKET_MIME_TYPES, BUCKET_SIZE_LIMITS } from "@/types/Statics";
import AppButton from "./AppButton";

const MAX_IMAGES = 5;

type ImageItem = {
  id: string;
  url?: string;
  file?: File;
  previewUrl: string;
};

type PostData = {
  id?: string;
  title: string;
  content: string;
  attachmentUrls: string[];
  postType: PostType;
  status: PostStatus;
};

interface PostEditorProps {
  initiativeId: string;
  initialData?: PostData;
  initialContent?: string;
  initialAttachmentUrls?: string[];
  onChange?: (content: string, attachmentUrls: string[]) => void;
  onSave?: (post: PostData) => void;
  onCancel?: () => void;
}

export default function PostEditor({
  initiativeId,
  initialData,
  initialContent,
  initialAttachmentUrls,
  onChange,
  onSave,
  onCancel,
}: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(
    initialContent ?? initialData?.content ?? "",
  );
  const [imageItems, setImageItems] = useState<ImageItem[]>(() =>
    (initialAttachmentUrls ?? initialData?.attachmentUrls ?? []).map((url) => ({
      id: url,
      url,
      previewUrl: url,
    })),
  );
  const [postType, setPostType] = useState<PostType>(
    initialData?.postType || "announcement",
  );
  const [isPending, startTransition] = useTransition();
  const { editorRef } = useEditorState();
  const imageItemsRef = useRef<ImageItem[]>(imageItems);

  useEffect(() => {
    imageItemsRef.current = imageItems;
  }, [imageItems]);

  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const extensions = useMemo(
    () => [
      BaseKit.configure({
        placeholder: {
          showOnlyCurrent: true,
          placeholder: "اكتب محتوى المنشور...",
        },
        characterCount: { limit: 2000 },
      }),
      Heading.configure({
        levels: [1, 2, 3],
        toolbar: true,
      }),
      Bold.configure({ toolbar: true }),
      Italic.configure({ toolbar: true }),
      BulletList.configure({ toolbar: true }),
      OrderedList.configure({ toolbar: true }),
      Link.configure({ toolbar: true, openOnClick: false }),
      Color.configure({ toolbar: true }),
      // Image.configure({ toolbar: true }),
      SlashCommand,
      ColumnActionButton,
    ],
    [],
  );

  const notifyChange = (nextContent: string, nextImages: ImageItem[]) => {
    onChange?.(
      nextContent,
      nextImages.map((item) => item.url ?? item.previewUrl),
    );
  };

  const handleContentChange = (nextContent: string) => {
    setContent(nextContent);
    notifyChange(nextContent, imageItems);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    const availableSlots = MAX_IMAGES - imageItems.length;

    if (availableSlots <= 0) {
      toast.error("يمكنك إضافة 5 صور كحد أقصى");
      return;
    }

    const nextFiles = selectedFiles.slice(0, availableSlots);
    const validItems: ImageItem[] = [];

    for (const file of nextFiles) {
      if (!BUCKET_MIME_TYPES["post-images"].includes(file.type)) {
        toast.error("نوع الصورة غير مدعوم");
        continue;
      }

      if (file.size > BUCKET_SIZE_LIMITS["post-images"]) {
        toast.error("حجم الصورة كبير جدا");
        continue;
      }

      validItems.push({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (selectedFiles.length > availableSlots) {
      toast.error("يمكنك إضافة 5 صور كحد أقصى");
    }

    const nextItems = [...imageItems, ...validItems];
    setImageItems(nextItems);
    notifyChange(content, nextItems);
  };

  const removeImage = (id: string) => {
    const removed = imageItems.find((item) => item.id === id);
    if (removed?.file) URL.revokeObjectURL(removed.previewUrl);

    const nextItems = imageItems.filter((item) => item.id !== id);
    setImageItems(nextItems);
    notifyChange(content, nextItems);
  };

  const handleSave = async (publishStatus: PostStatus) => {
    if (!title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }

    const keptImages = imageItems
      .map((item) => item.url)
      .filter((url): url is string => !!url);
    const imageFiles = imageItems
      .map((item) => item.file)
      .filter((file): file is File => !!file);

    const postData: PostData = {
      id: initialData?.id,
      title: title.trim(),
      content,
      attachmentUrls: keptImages,
      postType,
      status: publishStatus,
    };

    startTransition(async () => {
      const result = initialData?.id
        ? await updatePostAction(
            initialData.id,
            initiativeId,
            content,
            keptImages,
            imageFiles,
            title.trim(),
            postType,
            publishStatus,
          )
        : await createPostAction(
            initiativeId,
            content,
            imageFiles,
            title.trim(),
            postType,
            publishStatus,
          );

      if (result.success) {
        onSave?.(postData);
      } else {
        toast.error(result.error || "حدث خطأ");
      }
    });
  };

  const handleDraft = () => handleSave("draft");
  const handlePublish = () => handleSave("published");

  const postTypeLabels: Record<PostType, string> = useMemo(
    () => ({
      announcement: "إعلان",
      update: "تحديث",
      instruction: "تعليمات",
    }),
    [],
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle dir="rtl">
          {initialData?.id ? "تعديل المنشور" : "منشور جديد"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6" dir="rtl">
        <div className="flex-center-column gap-4 md:flex-row md:items-end">
          <FormInput
            type="text"
            label="العنوان"
            name="title"
            placeholder="أدخل عنوان المنشور..."
            value={title}
            onChange={(value) => setTitle(value as string)}
            className="flex-1 text-right"
            rtl={true}
          />

          <div className="space-y-2">
            <FormInput
              label="نوع المنشور"
              name="postType"
              value={postType}
              onChange={(value) => setPostType(value as PostType)}
              options={Object.entries(postTypeLabels).map(([key, label]) => ({
                value: key,
                label,
              }))}
              className="w-48"
              rtl={true}
              type={"select"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>المحتوى</Label>
          <div className="min-h-75 p-3">
            <RichTextEditor
              output="html"
              content={content}
              useEditorOptions={{ autofocus: "start" }}
              onChangeContent={handleContentChange}
              extensions={extensions}
              ref={editorRef}
              dark={false}
              bubbleMenu={{
                render(
                  { extensionsNames, editor, disabled },
                  bubbleDefaultDom,
                ) {
                  return (
                    <>
                      {bubbleDefaultDom}
                      {extensionsNames.includes("drawer") ? (
                        <BubbleMenuDrawer
                          disabled={disabled}
                          editor={editor}
                          key="drawer"
                        />
                      ) : null}
                    </>
                  );
                },
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="postImages">الصور</Label>
          <label className="border-neutrals-300 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center">
            <ImagePlus className="text-neutrals-500 h-6 w-6" />
            <span className="text-neutrals-600 text-sm">
              اختر حتى 5 صور للمنشور
            </span>
            <input
              id="postImages"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={isPending || imageItems.length >= MAX_IMAGES}
              onChange={(event) => {
                handleImageSelect(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

          {imageItems.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {imageItems.map((item) => (
                <div key={item.id} className="relative shrink-0">
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-32 w-auto rounded-md object-cover"
                  />
                  <button
                    type="button"
                    aria-label="إزالة الصورة"
                    className="absolute top-1 left-1 rounded-full bg-black/70 p-1 text-white"
                    disabled={isPending}
                    onClick={() => removeImage(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-4" dir="ltr">
          <AppButton
            type="outline"
            onClick={onCancel}
            disabled={isPending}
            border="square"
            size="sm"
          >
            إلغاء
          </AppButton>

          <div className="flex gap-2">
            <AppButton
              type="outline"
              onClick={handleDraft}
              disabled={isPending}
              icon={
                isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
              border="square"
              size="sm"
            >
              حفظ كمسودة
            </AppButton>

            <AppButton
              type="primary"
              onClick={handlePublish}
              disabled={isPending}
              border="square"
              size="sm"
              icon={
                isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              نشر
            </AppButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
