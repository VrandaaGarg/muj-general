"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Shield,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { updateUserAdminAction } from "@/lib/actions/admin";
import { useLocalCache } from "@/hooks/use-local-cache";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "reader" | "editor" | "admin";
  departmentId: string | null;
  departmentName: string | null;
  createdAt: Date;
}

interface Department {
  id: string;
  name: string;
  slug: string;
}

interface AdminUsersListProps {
  users: AdminUser[];
  departments: Department[];
}

const UPDATE_MESSAGES: Record<string, { text: string; type: "success" | "error" }> = {
  success: { text: "User updated successfully.", type: "success" },
  invalid: { text: "Invalid data — please check your inputs.", type: "error" },
  missing: { text: "User not found.", type: "error" },
  unverified: { text: "Cannot promote an unverified user to editor or admin.", type: "error" },
};

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Admin", color: "text-primary bg-primary/10", icon: ShieldAlert },
  editor: { label: "Editor", color: "text-primary bg-primary/10", icon: Shield },
  reader: { label: "Reader", color: "text-muted-foreground bg-muted", icon: User },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminUsersList({ users, departments }: AdminUsersListProps) {
  const { data: cachedUsers } = useLocalCache("admin-users:list", users);
  const { data: cachedDepartments } = useLocalCache(
    "admin-users:departments",
    departments,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateParam = searchParams.get("update");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "reader" | "editor" | "admin">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    if (!updateParam) return;
    const msg = UPDATE_MESSAGES[updateParam];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
    router.replace("/admin/users", { scroll: false });
  }, [updateParam, router]);

  const filteredUsers = cachedUsers
    .filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (verifiedFilter === "verified" && !user.emailVerified) {
        return false;
      }

      if (verifiedFilter === "unverified" && user.emailVerified) {
        return false;
      }

      if (departmentFilter !== "all" && user.departmentId !== departmentFilter) {
        return false;
      }

      if (query.trim()) {
        const haystack = `${user.name} ${user.email}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="grid gap-3  sm:grid-cols-2 lg:grid-cols-5">
          <Input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)
            }
            placeholder="Search name or email"
            className="h-8"
          />

          <AnimatedSelect
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as "all" | "reader" | "editor" | "admin")}
            options={[
              { value: "all", label: "All roles" },
              { value: "reader", label: "Reader" },
              { value: "editor", label: "Editor" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <AnimatedSelect
            value={verifiedFilter}
            onChange={(v) => setVerifiedFilter(v as "all" | "verified" | "unverified")}
            options={[
              { value: "all", label: "All verification" },
              { value: "verified", label: "Verified" },
              { value: "unverified", label: "Unverified" },
            ]}
          />

          <AnimatedSelect
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: "all", label: "All departments" },
              ...cachedDepartments.map((department) => ({
                value: department.id,
                label: department.name,
              })),
            ]}
          />

          <AnimatedSelect
            value={sortBy}
            onChange={(v) => setSortBy(v as "newest" | "oldest" | "name")}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Name A-Z" },
            ]}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredUsers.length} of {cachedUsers.length} {cachedUsers.length === 1 ? "user" : "users"}
        </p>
        <div className="flex gap-1.5">
          {(["admin", "editor", "reader"] as const).map((role) => {
            const count = cachedUsers.filter((u) => u.role === role).length;
            const cfg = ROLE_CONFIG[role];
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1    px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
              >
                {count} {cfg.label.toLowerCase()}{count !== 1 ? "s" : ""}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.map((u, idx) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
          >
            <UserCard user={u} departments={cachedDepartments} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function UserCard({
  user,
  departments,
}: {
  user: AdminUser;
  departments: Department[];
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedDept, setSelectedDept] = useState(user.departmentId ?? "");

  const roleCfg = ROLE_CONFIG[user.role];
  const RoleIcon = roleCfg.icon;

  function handleCancel() {
    setEditing(false);
    setSelectedRole(user.role);
    setSelectedDept(user.departmentId ?? "");
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    try {
      await updateUserAdminAction(formData);
    } catch {
      setSaving(false);
    }
  }

  const hasChanges = selectedRole !== user.role || selectedDept !== (user.departmentId ?? "");

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center   bg-muted">
              <User className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold tracking-tight truncate">
                {user.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 truncate">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1    px-2 py-0.5 text-[10px] font-semibold ${roleCfg.color}`}
            >
              <RoleIcon className="size-3" />
              {roleCfg.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {user.emailVerified ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-600" />
                <span className="text-emerald-600">Verified</span>
              </>
            ) : (
              <>
                <AlertCircle className="size-3 text-amber-600" />
                <span className="text-amber-600">Unverified</span>
              </>
            )}
          </span>
          {user.departmentName && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3" />
              {user.departmentName}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3" />
            Joined {formatDate(user.createdAt)}
          </span>
        </div>

        {/* Edit form */}
        {editing ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <form action={handleSubmit} className="space-y-3   border border-border/40 bg-muted/20 p-3">
              <input type="hidden" name="userId" value={user.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Role select */}
                <div className="space-y-1.5">
                  <Label htmlFor={`role-${user.id}`} className="text-xs">
                    Role
                  </Label>
                  <AnimatedSelect
                    id={`role-${user.id}`}
                    name="role"
                    value={selectedRole}
                    onChange={(v) => setSelectedRole(v as "reader" | "editor" | "admin")}
                    disabled={saving}
                    options={[
                      { value: "reader", label: "Reader" },
                      { value: "editor", label: "Editor" },
                      { value: "admin", label: "Admin" },
                    ]}
                  />
                  {!user.emailVerified &&
                    (selectedRole === "editor" || selectedRole === "admin") && (
                      <p className="text-[10px] text-amber-600">
                        User must verify email first
                      </p>
                    )}
                </div>

                {/* Department select */}
                <div className="space-y-1.5">
                  <Label htmlFor={`dept-${user.id}`} className="text-xs">
                    Department
                  </Label>
                  <AnimatedSelect
                    id={`dept-${user.id}`}
                    name="departmentId"
                    value={selectedDept}
                    onChange={setSelectedDept}
                    disabled={saving}
                    placeholder="No department"
                    options={[
                      { value: "", label: "No department" },
                      ...departments.map((d) => ({
                        value: d.id,
                        label: d.name,
                      })),
                    ]}
                   />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !hasChanges}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="pt-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit role & department
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
