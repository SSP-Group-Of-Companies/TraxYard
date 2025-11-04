"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { modalAnimations } from "@/lib/animations";
import { X } from "lucide-react";
import { EDamageLocation, EDamageType } from "@/types/movement.types";
import UploadPicker from "@/app/components/media/UploadPicker";
import type { IFileAsset } from "@/types/shared.types";
import { ES3Namespace, ES3Folder } from "@/types/aws.types";
import { uploadToS3Presigned, deleteTempFile } from "@/lib/utils/s3Helper";
import ThemedSelect from "@/app/components/ui/ThemedSelect";

export default function NewDamageModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (row: { location: EDamageLocation; type: EDamageType; comment?: string; photo: IFileAsset | null; }) => void; }) {
  const [loc, setLoc] = useState<string>("");
  const [typ, setTyp] = useState<string>("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<IFileAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<{ loc?: boolean; typ?: boolean }>({});
  const [photoErr, setPhotoErr] = useState(false);

  if (!open) return null;

  async function pick(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      if (photo) { try { await deleteTempFile(photo); } catch {} }
      const res = await uploadToS3Presigned({ file, namespace: ES3Namespace.MOVEMENTS, folder: ES3Folder.DAMAGES });
      setPhoto({ s3Key: res.s3Key, url: res.url, mimeType: res.mimeType, sizeBytes: res.sizeBytes, originalName: res.originalName });
      setPhotoErr(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[90] grid place-items-center" initial="initial" animate="animate" exit="exit">
        <motion.button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" variants={modalAnimations.backdrop as any} />
        <motion.div className="relative w-[min(720px,95vw)] bg-white rounded-xl shadow-xl ring-1 ring-black/10 p-4 sm:p-6" variants={modalAnimations.content as any}>
        <button aria-label="Close" className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white shadow ring-1 ring-black/10 hover:shadow-md" onClick={onClose}><X className="h-4 w-4" /></button>
        <div className="text-base font-semibold mb-3 text-center">New Damages</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="grid gap-3">
            <label className="text-sm">
            <span className="block text-xs font-medium text-gray-700 mb-1">Location:</span>
            <ThemedSelect value={loc} onChange={(v)=>{ setLoc(v); setErrs((e)=>({ ...e, loc: false })); }} options={["", ...Object.values(EDamageLocation)]} placeholderLabel="-- Location --" error={!!errs.loc} />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-medium text-gray-700 mb-1">Type:</span>
            <ThemedSelect value={typ} onChange={(v)=>{ setTyp(v); setErrs((e)=>({ ...e, typ: false })); }} options={["", ...Object.values(EDamageType)]} placeholderLabel="-- Type --" error={!!errs.typ} />
          </label>
          </div>
          <div className="md:justify-self-end">
            <span className="block text-xs font-medium text-gray-700 mb-1">Photo</span>
            <UploadPicker onPick={pick} accept="image/jpeg,image/png" menuPlacement="center" showDefaultTile={false}>
              <div className={`relative w-60 h-36 rounded-lg border-2 border-dashed grid place-items-center bg-gray-50 text-gray-700 overflow-hidden ${busy?"opacity-70":""} ${photoErr?"!border-red-400 ring-2 ring-red-200":""}`}>
                {photo ? (
                  <div className="absolute inset-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url!} alt="damage" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <span className="text-sm">Take a Photo</span>
                )}
              </div>
            </UploadPicker>
          </div>
          <label className="md:col-span-2 text-sm">
            <span className="block text-xs font-medium text-gray-700 mb-1">Comments</span>
            <textarea className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm min-h-[120px]" value={comment} onChange={(e)=>setComment(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="button-solid px-3 py-2" onClick={()=>{
            const invalidLoc = loc === "";
            const invalidTyp = typ === "";
            const invalidPhoto = !photo;
            if (invalidLoc || invalidTyp || invalidPhoto) { setErrs({ loc: invalidLoc, typ: invalidTyp }); setPhotoErr(invalidPhoto); return; }
            onAdd({ location: loc as any, type: typ as any, comment, photo }); onClose();
          }}>+ Add</button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


