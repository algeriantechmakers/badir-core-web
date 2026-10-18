"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deletePostAction,
  pinPostAction,
  listPostsAction,
} from "@/actions/posts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Pin,
  PinOff,
  Trash,
  Edit,
  Calendar,
  Flag,
} from "lucide-react";
import PostEditor from "@/components/PostEditor";
import { PostType } from "@prisma/client";
import AppButton from "@/components/AppButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn, formatDate } from "@/lib/utils";
import "reactjs-tiptap-editor/style.css";
import { Post } from "@/services/posts";
import Link from "next/link";
import parse from "html-react-parser";
import { toast } from "sonner";
import { ImageStrip } from "@/components/ImageStrip";
import ReportDialog from "@/components/ReportDialog";
import { ReportTarget } from "@prisma/client";

export default function PostsPanel({
  initiativeId,
  canWrite,
  isManager,
  managerId,
  currentUserId,
  onlyMine,
}: {
  initiativeId: string;
  canWrite: boolean;
  isManager: boolean;
  managerId: string;
  currentUserId?: string;
  onlyMine?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSetPosts = useCallback(
    (posts: Post[]) => {
      const postsWithDates = posts.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt),
      }));
      setPosts(
        postsWithDates.filter((p) => p.status === "published" || canWrite),
      );
    },
    [canWrite],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listPostsAction(
      initiativeId,
      onlyMine ? currentUserId : undefined,
      currentUserId ? undefined : "published",
    );
    handleSetPosts((res as any)?.posts || []);
    setLoading(false);
  }, [currentUserId, handleSetPosts, initiativeId, onlyMine]);

  useEffect(() => {
    load();
  }, [initiativeId, load, onlyMine]);

  const onDelete = (postId: string) => {
    startTransition(async () => {
      try {
        const res = await deletePostAction(postId, initiativeId);
        if ((res as any).success) load();
        setDeleteDialogOpen(false);
        setPostToDelete(null);
      } catch (error) {
        toast.error("حدث خطأ أثناء حذف المنشور. يرجى المحاولة مرة أخرى.");
      }
    });
  };

  const onPin = async (postId: string, pin: boolean) => {
    const res = await pinPostAction(postId, initiativeId, pin);
    if ((res as any).success) load();
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingPost(null);
    load();
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingPost(null);
  };

  const getPostTypeLabel = (type: PostType): string => {
    const labels: Record<PostType, string> = {
      announcement: "إعلان",
      update: "تحديث",
      instruction: "تعليمات",
    };
    return labels[type];
  };

  const getPostTypeBadgeColor = (type: PostType): string => {
    const colors: Record<PostType, string> = {
      announcement: "bg-blue-100 text-blue-800",
      update: "bg-green-100 text-green-800",
      instruction: "bg-yellow-100 text-yellow-800",
    };
    return colors[type];
  };

  if (showEditor) {
    return (
      <PostEditor
        initiativeId={initiativeId}
        initialData={
          editingPost
            ? {
                id: editingPost.id,
                title: editingPost.title || "",
                content: editingPost.content,
                attachmentUrls:
                  editingPost.attachments?.map((atch) => atch.imageUrl) ?? [],
                postType: editingPost.postType,
                status: editingPost.status,
              }
            : undefined
        }
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <div className="max-w-full space-y-4">
      {/* New Post Button */}
      {canWrite && (
        <div className="flex-center w-full justify-stretch gap-4" dir="rtl">
          <AppButton
            type="primary"
            onClick={handleNewPost}
            className="flex-1"
            icon={<Plus className="h-4 w-4" />}
            size="sm"
          >
            إنشاء منشور جديد
          </AppButton>
          {isManager && (
            <AppButton
              type="primary"
              size="sm"
              url={`/initiatives/${initiativeId}/edit`}
              className="flex-1"
              icon={<Edit className="h-4 w-4" />}
            >
              تعديل المبادرة
            </AppButton>
          )}
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex-center justify-center gap-2" dir="rtl">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent
            className="flex-center w-full justify-center gap-2 p-8"
            dir="rtl"
          >
            <p className="text-neutrals-500">لا توجد منشورات بعد.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const canEdit =
              post.author && (isManager || post.author.id === currentUserId);
            const isPinned = post.isPinned;
            const isAuthorManager = post.author?.organization?.id === managerId;

            // const isAuthorHelper =
            //   post.author.participations[0]?.participantRole === "helper";
            // if (!canEdit && post.status === "draft") return null;

            return (
              <Card
                key={post.id}
                className={`${
                  isPinned
                    ? "bg-yellow-50 ring-2 ring-yellow-200"
                    : "bg-neutrals-200"
                }`}
              >
                <CardHeader className="pb-3" dir="rtl">
                  <div className="grid w-full grid-cols-2 items-start gap-2">
                    <div className="flex-1 justify-self-start">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={getPostTypeBadgeColor(post.postType)}
                        >
                          {getPostTypeLabel(post.postType)}
                        </Badge>

                        {post.status === "draft" && (
                          <Badge variant="outline" className="text-gray-600">
                            مسودة
                          </Badge>
                        )}

                        {isPinned && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            <Pin className="ml-1 h-3 w-3" />
                            مثبت
                          </Badge>
                        )}
                      </div>

                      <h3
                        className="text-right text-lg font-semibold"
                        dir="rtl"
                      >
                        {post.title || "بدون عنوان"}
                      </h3>
                      {post.author?.id !== currentUserId && (
                        <ReportDialog
                          targetType={ReportTarget.POST}
                          targetId={post.id}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 gap-1"
                            >
                              <Flag className="h-3 w-3" />
                              إبلاغ
                            </Button>
                          }
                        />
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2 justify-self-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPost(post)}
                        >
                          <Edit className="size-3" />
                        </Button>

                        {isManager && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPin(post.id, !isPinned)}
                          >
                            {isPinned ? (
                              <PinOff className="size-3" />
                            ) : (
                              <Pin className="size-3" />
                            )}
                          </Button>
                        )}

                        <AlertDialog
                          open={deleteDialogOpen}
                          onOpenChange={setDeleteDialogOpen}
                        >
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setPostToDelete(post.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash className="size-3" />
                              </Button>
                            }
                          ></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader dir="rtl">
                              <AlertDialogTitle>
                                هل أنت متأكد من حذف هذا المنشور؟
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنشور
                                نهائياً.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-primary-500 text-primary-500 hover:bg-primary-100 hover:text-primary-400 text-button-sm sm:text-button-md h-8 border bg-transparent px-3 sm:h-10 sm:px-4">
                                إلغاء
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  if (postToDelete) {
                                    onDelete(postToDelete);
                                  }
                                }}
                                disabled={isPending}
                                className="text-button-sm sm:text-button-md bg-primary-500 hover:bg-primary-400 h-8 px-3 text-white sm:h-10 sm:px-4"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    <div className="col-span-2 mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(post.createdAt)}</span>
                      <span>•</span>
                      {post.author ? (
                        <Link
                          href={
                            post.author.organization
                              ? `/organizations/${post.author.organization.id}`
                              : `/profile/${post.author.id}`
                          }
                          className="text-neutrals-700 hover:text-primary-600 hover:underline"
                        >
                          <span>
                            {post.author.organization
                              ? post.author.organization.name
                              : post.author.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-neutrals-500">مستخدم_محذوف</span>
                      )}
                      <Badge
                        className={cn(
                          "rounded-full text-sm font-medium",
                          isAuthorManager
                            ? "bg-state-success text-secondary-700"
                            : "bg-state-success/80 text-secondary-700/80",
                        )}
                      >
                        {post.author ? (
                          <>
                            {isAuthorManager
                              ? "مدير المبادرة"
                              : post.author.id === currentUserId
                                ? "أنت"
                                : "مساعد"}
                          </>
                        ) : (
                          "مستخدم_محذوف"
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent dir="rtl">
                  <div className="prose prose-sm max-w-none">
                    {parse(post.content ?? "")}
                  </div>

                  {post.attachments?.length > 0 && (
                    <ImageStrip attachments={post.attachments} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
