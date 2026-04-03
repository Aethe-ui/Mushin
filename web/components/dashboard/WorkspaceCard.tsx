import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { CollaboratorUser } from "@/types/mushin";

export function WorkspaceCard({
  id,
  title,
  updatedAt,
  collaborators,
}: {
  id: string;
  title: string;
  updatedAt: string;
  collaborators?: CollaboratorUser[];
}) {
  const date = new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/workspace/${id}`}
      className="group block rounded-lg border border-border bg-bg-surface p-4 transition-colors hover:border-border-active"
    >
      <h3 className="font-mono text-text-primary group-hover:text-accent">
        {title}
      </h3>
      <p className="mt-1 text-xs text-text-tertiary">Updated {date}</p>
      {collaborators && collaborators.length > 0 && (
        <div className="mt-3 flex -space-x-1.5">
          {collaborators.slice(0, 5).map((c) => (
            <Avatar
              key={c.user_id}
              email={c.email}
              label={c.full_name ?? undefined}
              className="relative ring-2 ring-bg-surface"
            />
          ))}
        </div>
      )}
    </Link>
  );
}
