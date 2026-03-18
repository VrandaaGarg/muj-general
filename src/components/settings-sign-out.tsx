"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SettingsSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="destructive" onClick={handleSignOut}>
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
