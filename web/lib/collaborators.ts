import { createServiceClient } from "@/lib/supabase/service";
import type { CollaboratorUser } from "@/types/mushin";

function getAdmin() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export async function enrichUserIds(userIds: string[]): Promise<CollaboratorUser[]> {
  if (userIds.length === 0) return [];
  const admin = getAdmin();
  if (!admin) {
    return userIds.map((user_id) => ({
      user_id,
      email: null,
      full_name: null,
    }));
  }
  const out: CollaboratorUser[] = [];
  for (const uid of userIds) {
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (error || !data?.user) {
      out.push({ user_id: uid, email: null, full_name: null });
      continue;
    }
    const meta = data.user.user_metadata as Record<string, string> | undefined;
    out.push({
      user_id: uid,
      email: data.user.email ?? null,
      full_name: (meta?.full_name as string) ?? (meta?.name as string) ?? null,
    });
  }
  return out;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = getAdmin();
  if (!admin) return null;
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data?.users?.length) return null;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === normalized
    );
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}
