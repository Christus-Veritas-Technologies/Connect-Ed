"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { ChatMember } from "@/lib/hooks/use-chat";

const ROLE_ORDER = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  TEACHER: "bg-blue-100 text-blue-700",
  STUDENT: "bg-emerald-100 text-emerald-700",
  PARENT: "bg-amber-100 text-amber-700",
};

interface MembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ChatMember[];
}

export function MembersSheet({ open, onOpenChange, members }: MembersSheetProps) {
  // Group members by role
  const grouped = ROLE_ORDER.reduce<Record<string, ChatMember[]>>((acc, role) => {
    acc[role] = members.filter((m) => m.role === role);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>Chat Members ({members.length})</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {ROLE_ORDER.map((role) => {
            const group = grouped[role];
            if (!group || group.length === 0) return null;
            return (
              <div key={role}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {role}s ({group.length})
                </h4>
                <div className="space-y-1.5">
                  {group.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {member.name}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
