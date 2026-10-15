"use client";

import { useEffect } from "react";
import { DashboardClient } from "@/components/DashboardClient";
import { withBasePath } from "@/lib/config/site";
import { getSession } from "@/lib/sso/client-auth";

export default function DashboardPage() {
  useEffect(() => {
    if (!getSession()) {
      window.location.href = withBasePath("/");
    }
  }, []);

  return <DashboardClient />;
}
