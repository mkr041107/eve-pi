"use client";

import { useEffect } from "react";
import { DashboardClient } from "@/components/DashboardClient";
import { withBasePath } from "@/lib/config/site";
import { listAccounts } from "@/lib/sso/client-auth";

export default function DashboardPage() {
  useEffect(() => {
    if (listAccounts().length === 0) {
      window.location.href = withBasePath("/");
    }
  }, []);

  return <DashboardClient />;
}
