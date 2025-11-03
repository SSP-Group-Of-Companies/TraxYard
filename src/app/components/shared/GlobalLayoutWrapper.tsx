"use client";

import { ReactNode } from "react";
import GlobalLoader from "@/app/components/shared/GlobalLoader";
import { useNavigationLoadingSmart } from "@/hooks/useNavigationLoadingSmart";

type Props = { children: ReactNode };

export default function GlobalLayoutWrapper({ children }: Props) {
  // Mount the navigation loader side-effects globally
  useNavigationLoadingSmart();
  return (
    <>
      <GlobalLoader />
      {children}
    </>
  );
}


