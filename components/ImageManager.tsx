"use client";

import { useCallback, useRef, useState } from "react";
import AppButton from "@/components/AppButton";
import { Check, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Cropper, { Area } from "react-easy-crop";

interface ImageManagerProps {
  currentImageUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void> | void;
  shape?: "circle" | "square";
  note?: string;
  className?: string;
}

export default function ImageManager({
  currentImageUrl,
  onUpload,
  onDelete,
  shape = "circle",
  note,
  className,
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedArea: Area) => {
      setCroppedAreaPixels(croppedArea);
    },
    [],
  );

  const getCroppedFile = async () => {
    if (!selectedImage || !croppedAreaPixels) return null;

    const image = new window.Image();
    image.src = selectedImage;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return null;

    return new File([blob], "profile-image.png", { type: "image/png" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSelectedImage(imageUrl);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCancelCrop = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setCroppedAreaPixels(null);
  };

  const handleConfirmCrop = async () => {
    setIsUploading(true);
    try {
      const croppedFile = await getCroppedFile();
      if (croppedFile) await onUpload(croppedFile);
      handleCancelCrop();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const isCircle = shape === "circle";

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {currentImageUrl ? (
        <div
          className={cn(
            "bg-secondary-100 relative overflow-hidden border border-gray-200 shadow-sm",
            isCircle
              ? "h-24 w-24 rounded-full"
              : "aspect-video h-48 w-full rounded-md",
          )}
        >
          <Image
            src={currentImageUrl}
            alt="Current"
            fill
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "relative flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50",
            isCircle
              ? "h-24 w-24 rounded-full"
              : "aspect-video h-48 w-full rounded-md",
          )}
          aria-label="Upload image"
        >
          <Upload
            className={cn("text-gray-400", isCircle ? "h-8 w-8" : "h-10 w-10")}
          />
        </button>
      )}

      {currentImageUrl && onDelete && (
        <AppButton
          type="outline"
          className="absolute -right-2 -bottom-2 flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border-gray-200 bg-white p-0 text-red-500 shadow-md hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          onClick={handleDelete}
          disabled={isDeleting || isUploading}
          aria-label="Delete image"
        >
          <Trash2 className="h-5 w-5" />
        </AppButton>
      )}

      {note && <p className="mt-2 text-end text-xs text-gray-500">{note}</p>}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="قص الصورة"
        >
          <div className="bg-neutrals-100 flex w-full max-w-lg flex-col gap-4 rounded-lg p-4">
            <div className="bg-secondary-100 relative h-72 w-full overflow-hidden rounded-md">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape={isCircle ? "round" : "rect"}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="text-neutrals-700 flex items-center gap-3 text-sm">
              <span>التكبير</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="flex-1"
              />
            </label>
            <div className="flex justify-end gap-2">
              <AppButton
                type="outline"
                size="sm"
                border="square"
                icon={<X className="h-4 w-4" />}
                onClick={handleCancelCrop}
                disabled={isUploading}
              >
                إلغاء
              </AppButton>
              <AppButton
                type="primary"
                size="sm"
                border="square"
                icon={<Check className="h-4 w-4" />}
                onClick={handleConfirmCrop}
                isLoading={isUploading}
              >
                حفظ
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
