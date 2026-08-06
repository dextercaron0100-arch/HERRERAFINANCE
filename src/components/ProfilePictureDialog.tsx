import { useRef } from "react";
import { Camera, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import type { Profile } from "@/types";

interface ProfilePictureDialogProps {
  profile: Profile;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

export default function ProfilePictureDialog({
  profile,
  isOpen,
  isSaving,
  onClose,
  onSelectFile,
  onRemove,
}: ProfilePictureDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-picture-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-picture-title" className="text-lg font-bold text-slate-900">
              Profile picture
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This picture appears on your signed-in account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close profile picture dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="relative">
            <ProfileAvatar
              name={profile.fullName}
              src={profile.profilePictureUrl}
              size="xl"
              className="ring-4 ring-emerald-50"
            />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-md">
              <Camera className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">{profile.fullName}</p>
          <p className="text-xs text-slate-500">{profile.email}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onSelectFile(file);
          }}
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Upload photo"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isSaving || !profile.profilePictureUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Remove photo
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          JPG, PNG, or WEBP. Maximum 5 MB. Images are cropped to a square.
        </p>
      </div>
    </div>
  );
}
