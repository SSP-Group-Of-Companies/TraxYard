//Small component for profile + fallback
"use client";

import Image from "next/image";
import { UserCircle } from "lucide-react";
import { IUser } from "@/types/user.types";

interface ProfileAvatarProps {
  user: IUser;
  size?: number; // Optional: size in pixels (default 32)
}

export default function ProfileAvatar({ size = 32, user }: ProfileAvatarProps) {
  const userImage = user?.picture;

  if (userImage) {
    return <Image src={userImage} alt="User Profile" width={size} height={size} className="rounded-full object-cover border-2" style={{ borderColor: "var(--color-outline)" }} />;
  }

  return <UserCircle width={size} height={size} style={{ color: "var(--color-on-surface-variant)" }} />;
}
