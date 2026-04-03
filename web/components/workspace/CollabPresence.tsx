"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { CollaboratorUser } from "@/types/mushin";

const MAX = 5;

export function CollabPresence({ users }: { users: CollaboratorUser[] }) {
  const shown = users.slice(0, MAX);
  const more = users.length - shown.length;

  if (users.length === 0) return null;

  return (
    <div className="collab-panel flex items-center gap-1">
      <span className="mr-2 text-xs text-text-tertiary">Here</span>
      <div className="flex -space-x-1.5">
        {shown.map((u) => (
          <Avatar
            key={u.user_id}
            email={u.email}
            label={u.full_name ?? undefined}
            className="relative ring-2 ring-bg-primary"
            title={
              (u.full_name || u.email || "Collaborator") + " — Active now"
            }
          />
        ))}
      </div>
      {more > 0 && (
        <span className="ml-1 text-xs text-text-tertiary">+{more} more</span>
      )}
    </div>
  );
}
