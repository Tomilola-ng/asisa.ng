import { requireSupabase, publicUrl, supabase, supabaseEnabled } from "./supabase";
import type { Database } from "./database.types";
import {
  DEFAULT_FEATURE_FLAGS,
  DEMO_COURSES,
  DEMO_POSTS,
  readDemoFeatureFlags,
  readDemoLevelImages,
  writeDemoFeatureFlags,
  writeDemoLevelImage,
} from "./demo-data";
import type {
  AcademicSession,
  AsisaUser,
  Comment,
  Course,
  Department,
  FeatureFlags,
  FeedScope,
  Group,
  Level,
  LevelImage,
  Post,
  ReactionKind,
  Role,
  Semester,
  AdminUser,
} from "./types";

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** Set VITE_COURSES_HAVE_SESSION=true in .env after running add-course-session-id.sql */
export const coursesHaveSession = import.meta.env.VITE_COURSES_HAVE_SESSION === "true";

function must<T>(data: T | null, message = "Unexpected empty response"): T {
  if (data == null) throw new Error(message);
  return data;
}

function mapCourse(row: {
  id: string;
  code: string;
  title: string;
  department_id: string;
  level: number;
  semester: number;
  units: number;
  description: string;
  thumbnail_path: string | null;
  drive_folder_url: string | null;
  past_questions_url: string | null;
  representative_id: string | null;
  session_id: string | null;
}): Course {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    departmentId: row.department_id,
    level: row.level as Level,
    semester: row.semester as Semester,
    units: row.units,
    description: row.description,
    thumbnailPath: row.thumbnail_path ?? undefined,
    thumbnailUrl: publicUrl("course-thumbnails", row.thumbnail_path),
    driveFolderUrl: row.drive_folder_url ?? undefined,
    pastQuestionsUrl: row.past_questions_url ?? undefined,
    representativeId: row.representative_id ?? undefined,
    sessionId: row.session_id ?? undefined,
  };
}

export async function fetchAsisaUser(userId: string, email: string): Promise<AsisaUser> {
  const client = requireSupabase();
  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
    await Promise.all([
      client.from("profiles").select("*").eq("id", userId).maybeSingle(),
      client.from("user_roles").select("*").eq("user_id", userId),
    ]);
  throwIfError(profileError);
  throwIfError(rolesError);

  const roleRows = roles ?? [];
  const admin = roleRows.find((r) => r.role === "super_admin");
  const rep = roleRows.find((r) => r.role === "course_rep");
  const role: Role = admin ? "super_admin" : rep ? "course_rep" : "student";

  return {
    id: userId,
    email: profile?.email ?? email,
    fullName: profile?.full_name ?? "",
    matricNumber: profile?.matric_number ?? undefined,
    level: (profile?.level as Level | null) ?? undefined,
    role,
    avatarUrl: profile?.avatar_url ?? undefined,
    departmentId: profile?.department_id ?? undefined,
    scopedDepartmentId: rep?.department_id ?? profile?.department_id ?? undefined,
    scopedLevel: rep?.level ?? profile?.level ?? undefined,
  };
}

export async function listDepartments(): Promise<Department[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("departments").select("*").order("code");
  throwIfError(error);
  return (data ?? []).map((d) => ({ id: d.id, name: d.name, code: d.code }));
}

export async function listSessions(): Promise<AcademicSession[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("sessions").select("*").order("label");
  throwIfError(error);
  return (data ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    isCurrent: s.is_current,
  }));
}

export async function listCourses(): Promise<Course[]> {
  if (!supabaseEnabled) return DEMO_COURSES;
  const client = requireSupabase();
  const { data, error } = await client.from("courses").select("*").order("level").order("code");
  throwIfError(error);
  return (data ?? []).map(mapCourse);
}

export async function getCourse(id: string): Promise<Course | null> {
  if (!supabaseEnabled) {
    return DEMO_COURSES.find((c) => c.id === id) ?? null;
  }
  const client = requireSupabase();
  const { data, error } = await client.from("courses").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? mapCourse(data) : null;
}

function courseRowPayload(
  course: Omit<Course, "thumbnailUrl" | "id"> & { id?: string },
  userId?: string,
) {
  const row: Record<string, unknown> = {
    code: course.code,
    title: course.title,
    description: course.description,
    department_id: course.departmentId,
    level: course.level,
    semester: course.semester,
    units: course.units,
    drive_folder_url: course.driveFolderUrl || null,
    past_questions_url: course.pastQuestionsUrl || null,
    thumbnail_path: course.thumbnailPath || null,
    representative_id: course.representativeId || null,
  };
  // Only send session_id when the DB column exists (see supabase/patches/add-course-session-id.sql).
  if (coursesHaveSession && course.sessionId !== undefined) {
    row.session_id = course.sessionId || null;
  }
  if (userId) row.created_by = userId;
  return row;
}

export async function upsertCourse(
  course: Omit<Course, "thumbnailUrl" | "id"> & { id?: string },
  userId: string,
): Promise<Course> {
  const client = requireSupabase();
  if (course.id) {
    const { data, error } = await client
      .from("courses")
      .update({
        ...courseRowPayload(course),
        updated_at: new Date().toISOString(),
      })
      .eq("id", course.id)
      .select("*")
      .single();
    throwIfError(error);
    return mapCourse(must(data));
  }

  const { data, error } = await client
    .from("courses")
    .insert(courseRowPayload(course, userId))
    .select("*")
    .single();
  throwIfError(error);
  return mapCourse(must(data));
}

export async function deleteCourse(courseId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("courses").delete().eq("id", courseId);
  throwIfError(error);
}

export async function uploadCourseThumbnail(
  courseId: string,
  userId: string,
  file: File,
): Promise<string> {
  const client = requireSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${courseId}.${ext}`;
  const bucket = client.storage.from("course-thumbnails");

  const { data: existing } = await client
    .from("courses")
    .select("thumbnail_path")
    .eq("id", courseId)
    .maybeSingle();

  const pathsToRemove = new Set<string>([path]);
  if (existing?.thumbnail_path) pathsToRemove.add(existing.thumbnail_path);
  await bucket.remove([...pathsToRemove]);

  const { error: uploadError } = await bucket.upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(
      `Thumbnail upload failed: ${uploadError.message}. If this mentions row-level security, run supabase/patches/fix-thumbnail-storage-rls.sql in the Supabase SQL editor.`,
    );
  }

  const { error } = await client
    .from("courses")
    .update({ thumbnail_path: path, updated_at: new Date().toISOString() })
    .eq("id", courseId);
  throwIfError(error);
  return publicUrl("course-thumbnails", path) ?? path;
}

/**
 * One shared image per level (100/200/300/400/500) instead of a thumbnail per
 * course — keeps storage/db small since dozens of courses at the same level
 * reuse a single image reference.
 */
export async function listLevelImages(): Promise<LevelImage[]> {
  if (!supabaseEnabled) return readDemoLevelImages();
  const client = requireSupabase();
  const { data, error } = await client.from("level_images").select("*");
  throwIfError(error);
  return (data ?? []).map((row) => ({
    level: row.level as Level,
    imagePath: row.image_path ?? undefined,
    imageUrl: publicUrl("level-images", row.image_path),
  }));
}

export async function setLevelImage(level: Level, file: File): Promise<LevelImage> {
  if (!supabaseEnabled) {
    return writeDemoLevelImage(level, file);
  }
  const client = requireSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `level-${level}.${ext}`;
  const { error: uploadError } = await client.storage
    .from("level-images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (uploadError) throw new Error(`Level image upload failed: ${uploadError.message}`);

  const { error } = await client
    .from("level_images")
    .upsert({ level, image_path: path }, { onConflict: "level" });
  throwIfError(error);
  return { level, imagePath: path, imageUrl: publicUrl("level-images", path) };
}

/**
 * Lets a super admin roll a new feature out to course reps first, then to
 * students, instead of flipping it on for everyone at once.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (!supabaseEnabled) return readDemoFeatureFlags();
  const client = requireSupabase();
  const { data, error } = await client
    .from("app_settings")
    .select("*")
    .eq("id", "feature_flags")
    .maybeSingle();
  throwIfError(error);
  return {
    quizVisibleToCourseReps:
      data?.quiz_visible_to_course_reps ?? DEFAULT_FEATURE_FLAGS.quizVisibleToCourseReps,
    quizVisibleToStudents:
      data?.quiz_visible_to_students ?? DEFAULT_FEATURE_FLAGS.quizVisibleToStudents,
  };
}

export async function setFeatureFlags(patch: Partial<FeatureFlags>): Promise<FeatureFlags> {
  if (!supabaseEnabled) return writeDemoFeatureFlags(patch);
  const client = requireSupabase();
  const row: Database["public"]["Tables"]["app_settings"]["Insert"] = { id: "feature_flags" };
  if (patch.quizVisibleToCourseReps !== undefined) {
    row.quiz_visible_to_course_reps = patch.quizVisibleToCourseReps;
  }
  if (patch.quizVisibleToStudents !== undefined) {
    row.quiz_visible_to_students = patch.quizVisibleToStudents;
  }
  const { error } = await client.from("app_settings").upsert(row, { onConflict: "id" });
  throwIfError(error);
  return getFeatureFlags();
}

export async function listGroups(userId?: string): Promise<Group[]> {
  const client = requireSupabase();
  const { data: groups, error } = await client
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);

  const ids = (groups ?? []).map((g) => g.id);
  if (ids.length === 0) return [];

  const { data: members, error: membersError } = await client
    .from("group_members")
    .select("group_id, user_id")
    .in("group_id", ids);
  throwIfError(membersError);

  const countByGroup = new Map<string, number>();
  const memberSet = new Set<string>();
  for (const m of members ?? []) {
    countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1);
    if (userId && m.user_id === userId) memberSet.add(m.group_id);
  }

  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    imagePath: g.image_path ?? undefined,
    imageUrl: publicUrl("group-images", g.image_path),
    memberCount: countByGroup.get(g.id) ?? 0,
    ownerId: g.owner_id,
    isPrivate: g.is_private,
    isMember: memberSet.has(g.id) || g.owner_id === userId,
  }));
}

export async function getGroup(id: string, userId?: string): Promise<Group | null> {
  const groups = await listGroups(userId);
  return groups.find((g) => g.id === id) ?? null;
}

export async function createGroup(input: {
  name: string;
  description: string;
  ownerId: string;
  isPrivate?: boolean;
  imageFile?: File | null;
}): Promise<Group> {
  const client = requireSupabase();
  let imagePath: string | null = null;

  const { data, error } = await client
    .from("groups")
    .insert({
      name: input.name,
      description: input.description,
      owner_id: input.ownerId,
      is_private: input.isPrivate ?? false,
    })
    .select("*")
    .single();
  throwIfError(error);

  const group = must(data);

  const { error: memberError } = await client.from("group_members").insert({
    group_id: group.id,
    user_id: input.ownerId,
  });
  throwIfError(memberError);

  if (input.imageFile) {
    const ext = input.imageFile.name.split(".").pop() || "jpg";
    imagePath = `${input.ownerId}/${group.id}.${ext}`;
    const { error: uploadError } = await client.storage
      .from("group-images")
      .upload(imagePath, input.imageFile, { upsert: true, contentType: input.imageFile.type });
    throwIfError(uploadError);
    const { error: updateError } = await client
      .from("groups")
      .update({ image_path: imagePath })
      .eq("id", group.id);
    throwIfError(updateError);
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    imagePath: imagePath ?? undefined,
    imageUrl: publicUrl("group-images", imagePath),
    memberCount: 1,
    ownerId: group.owner_id,
    isPrivate: group.is_private,
    isMember: true,
  };
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
  });
  throwIfError(error);
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  throwIfError(error);
}

export async function listPosts(opts: {
  scope: FeedScope;
  scopeId?: string | null;
  classLevel?: number | null;
  userId?: string;
}): Promise<Post[]> {
  if (!supabaseEnabled) {
    return DEMO_POSTS.filter((p) => p.scope === opts.scope);
  }
  const client = requireSupabase();
  let query = client
    .from("posts")
    .select("*")
    .eq("scope", opts.scope)
    .order("created_at", { ascending: false });

  if (opts.scope === "public") {
    query = query.is("scope_id", null);
  } else if (opts.scopeId) {
    query = query.eq("scope_id", opts.scopeId);
  }
  if (opts.scope === "class" && opts.classLevel) {
    query = query.eq("class_level", opts.classLevel);
  }

  const { data: posts, error } = await query;
  throwIfError(error);
  if (!posts?.length) return [];

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const postIds = posts.map((p) => p.id);

  const [{ data: profiles }, { data: reactions }, { data: comments }] = await Promise.all([
    client.from("profiles").select("id, full_name, avatar_url").in("id", authorIds),
    client.from("reactions").select("post_id, user_id").in("post_id", postIds),
    client.from("comments").select("post_id").in("post_id", postIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const reactionCount = new Map<string, number>();
  const reactedByMe = new Set<string>();
  for (const r of reactions ?? []) {
    reactionCount.set(r.post_id, (reactionCount.get(r.post_id) ?? 0) + 1);
    if (opts.userId && r.user_id === opts.userId) reactedByMe.add(r.post_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  }

  return posts.map((p) => {
    const author = profileMap.get(p.author_id);
    return {
      id: p.id,
      authorId: p.author_id,
      authorName: author?.full_name || "Actuarial Science & Insurance Nexus member",
      authorAvatar: author?.avatar_url ?? undefined,
      scope: p.scope,
      scopeId: p.scope_id ?? undefined,
      classLevel: (p.class_level as Level | null) ?? undefined,
      body: p.body,
      imageUrl: p.image_url ?? undefined,
      createdAt: p.created_at,
      reactions: reactionCount.get(p.id) ?? 0,
      comments: commentCount.get(p.id) ?? 0,
      reactedByMe: reactedByMe.has(p.id),
    };
  });
}

export async function createPost(input: {
  authorId: string;
  scope: FeedScope;
  scopeId?: string | null;
  classLevel?: number | null;
  body: string;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("posts").insert({
    author_id: input.authorId,
    scope: input.scope,
    scope_id: input.scopeId ?? null,
    class_level: input.classLevel ?? null,
    body: input.body,
  });
  throwIfError(error);
}

export async function toggleReaction(
  postId: string,
  userId: string,
  kind: ReactionKind = "like",
): Promise<"added" | "removed"> {
  const client = requireSupabase();
  const { data: existing } = await client
    .from("reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    throwIfError(error);
    return "removed";
  }

  const { error } = await client.from("reactions").insert({
    post_id: postId,
    user_id: userId,
    kind,
  });
  throwIfError(error);
  return "added";
}

export async function listComments(postId: string): Promise<Comment[]> {
  const client = requireSupabase();
  const { data: comments, error } = await client
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  if (!comments?.length) return [];

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return comments.map((c) => {
    const author = profileMap.get(c.author_id);
    return {
      id: c.id,
      postId: c.post_id,
      authorId: c.author_id,
      authorName: author?.full_name || "Actuarial Science & Insurance Nexus member",
      authorAvatar: author?.avatar_url ?? undefined,
      body: c.body,
      createdAt: c.created_at,
    };
  });
}

export async function createComment(input: {
  postId: string;
  authorId: string;
  body: string;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("comments").insert({
    post_id: input.postId,
    author_id: input.authorId,
    body: input.body,
  });
  throwIfError(error);
}

export async function updateProfileRow(
  userId: string,
  patch: {
    fullName?: string;
    matricNumber?: string;
    level?: number;
    departmentId?: string;
    avatarUrl?: string;
    bio?: string;
  },
): Promise<void> {
  const client = requireSupabase();
  const update: {
    updated_at: string;
    full_name?: string;
    matric_number?: string | null;
    level?: number | null;
    department_id?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (patch.fullName !== undefined) update.full_name = patch.fullName;
  if (patch.matricNumber !== undefined) update.matric_number = patch.matricNumber || null;
  if (patch.level !== undefined) update.level = patch.level;
  if (patch.departmentId !== undefined) update.department_id = patch.departmentId || null;
  if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl || null;
  if (patch.bio !== undefined) update.bio = patch.bio || null;

  const { error } = await client.from("profiles").update(update).eq("id", userId);
  throwIfError(error);
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const client = requireSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await client.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  throwIfError(uploadError);

  const url = publicUrl("profile-photos", path);
  await updateProfileRow(userId, { avatarUrl: url });
  return url ?? path;
}

export async function createDepartment(code: string, name: string): Promise<Department> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("departments")
    .insert({ code: code.toUpperCase(), name })
    .select("*")
    .single();
  throwIfError(error);
  const dept = must(data);
  return { id: dept.id, code: dept.code, name: dept.name };
}

export async function updateDepartment(
  id: string,
  patch: { code?: string; name?: string },
): Promise<Department> {
  const client = requireSupabase();
  const update: { code?: string; name?: string } = {};
  if (patch.code !== undefined) update.code = patch.code.toUpperCase();
  if (patch.name !== undefined) update.name = patch.name;
  const { data, error } = await client
    .from("departments")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error);
  const dept = must(data);
  return { id: dept.id, code: dept.code, name: dept.name };
}

export async function deleteDepartment(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("departments").delete().eq("id", id);
  throwIfError(error);
}

export async function createSession(label: string, isCurrent = false): Promise<AcademicSession> {
  const client = requireSupabase();
  if (isCurrent) {
    await client.from("sessions").update({ is_current: false }).eq("is_current", true);
  }
  const { data, error } = await client
    .from("sessions")
    .insert({ label, is_current: isCurrent })
    .select("*")
    .single();
  throwIfError(error);
  const session = must(data);
  return { id: session.id, label: session.label, isCurrent: session.is_current };
}

export async function findOrCreateSession(label: string): Promise<AcademicSession> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Session label is required");
  const client = requireSupabase();
  const { data: existing, error: findError } = await client
    .from("sessions")
    .select("*")
    .eq("label", trimmed)
    .maybeSingle();
  throwIfError(findError);
  if (existing) {
    return { id: existing.id, label: existing.label, isCurrent: existing.is_current };
  }
  return createSession(trimmed, false);
}

export async function assignRole(input: {
  userId: string;
  role: Role;
  departmentId?: string | null;
  level?: number | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("user_roles").insert({
    user_id: input.userId,
    role: input.role,
    department_id: input.departmentId ?? null,
    level: input.level ?? null,
  });
  throwIfError(error);
}

export async function deleteRole(roleId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("user_roles").delete().eq("id", roleId);
  throwIfError(error);
}

export async function updateAdminUserProfile(
  userId: string,
  patch: {
    fullName?: string;
    matricNumber?: string;
    level?: number;
    departmentId?: string | null;
  },
): Promise<void> {
  await updateProfileRow(userId, {
    fullName: patch.fullName,
    matricNumber: patch.matricNumber,
    level: patch.level,
    departmentId: patch.departmentId ?? undefined,
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_delete_user", { target_user_id: userId });
  throwIfError(error);
}

export async function listProfilesForAdmin(): Promise<
  Array<{
    id: string;
    fullName: string;
    email: string | null;
    level: number | null;
    matricNumber: string | null;
    departmentId: string | null;
  }>
> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, level, matric_number, department_id")
    .order("full_name");
  throwIfError(error);
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    level: p.level,
    matricNumber: p.matric_number,
    departmentId: p.department_id,
  }));
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const [profiles, roles] = await Promise.all([listProfilesForAdmin(), listRolesForAdmin()]);
  const rolesByUser = new Map<string, AdminUser["roles"]>();
  for (const role of roles) {
    const list = rolesByUser.get(role.userId) ?? [];
    list.push({
      id: role.id,
      role: role.role,
      departmentId: role.departmentId,
      level: role.level,
    });
    rolesByUser.set(role.userId, list);
  }
  return profiles.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    matricNumber: p.matricNumber,
    level: p.level,
    departmentId: p.departmentId,
    roles: rolesByUser.get(p.id) ?? [],
  }));
}

export async function listRolesForAdmin(): Promise<
  Array<{
    id: string;
    userId: string;
    role: Role;
    departmentId: string | null;
    level: number | null;
  }>
> {
  const client = requireSupabase();
  const { data, error } = await client.from("user_roles").select("*").order("created_at", {
    ascending: false,
  });
  throwIfError(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    role: r.role,
    departmentId: r.department_id,
    level: r.level,
  }));
}

export { supabase };
