"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { useState } from "react";

import NotificationBell from "@/components/dashboard/NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "@/lib/toast";
import { roleLabel } from "@/lib/dashboard/roles";
import type { UserRole } from "@/lib/marketplace/types";

type DashboardTopBarProps = {
  role: UserRole;
  email?: string;
  onMenuClick: () => void;
};

export default function DashboardTopBar({
  role,
  email,
  onMenuClick,
}: DashboardTopBarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="size-4" />
          </Button>

          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-neutral-950 sm:text-lg"
          >
            Trade Grid Global
          </Link>

          <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 sm:inline-flex">
            {roleLabel(role)}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          {email ? (
            <span className="hidden max-w-[180px] truncate text-sm text-neutral-500 md:inline">
              {email}
            </span>
          ) : null}

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/marketplace">
              <ExternalLink className="size-3.5" />
              Marketplace
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">
              {loggingOut ? "Signing out..." : "Sign out"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
