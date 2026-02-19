import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, NotificationType } from "@repo/db";
import { uploadFile, getDownloadUrl, getViewUrl, deleteFile, formatFileSize } from "@repo/upload";
import { requireAuth, requireParentAuth, requireStudentAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const sharedFiles = new Hono();

// ─── Validation Schemas ──────────────────────────────────────

const shareSchema = z.object({
  recipients: z.array(
    z.object({
      type: z.enum(["USER", "STUDENT", "PARENT", "ROLE"]),
      id: z.string().optional(),   // Required for USER/STUDENT/PARENT
      role: z.string().optional(),  // Required for ROLE type
    })
  ).min(1, "At least one recipient is required"),
});

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
]);

// Also check by extension as fallback (browsers sometimes send wrong MIME types)
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "tif",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf",
]);

function isAllowedFile(mimeType: string, fileName: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType)) return true;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSIONS.has(ext);
}

// ─── Staff Routes (require auth) ─────────────────────────────

const staffRoutes = new Hono();
staffRoutes.use("*", requireAuth);

// POST /shared-files/upload — Upload a file and optionally share it
staffRoutes.post("/upload", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const user = c.get("user");
    const role = c.get("role");
    const isStudent = role === ("STUDENT" as any);

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const recipientsRaw = formData.get("recipients") as string | null;

    if (!file) {
      return errors.validationError(c, { file: "File is required" });
    }

    if (file.size > MAX_FILE_SIZE) {
      return errors.validationError(c, {
        file: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
      });
    }

    // Validate file type
    if (!isAllowedFile(file.type, file.name)) {
      return errors.validationError(c, {
        file: "File type not allowed. Please upload an image (JPG, PNG, GIF, WebP, SVG) or document (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV).",
      });
    }

    if (!title || title.trim().length === 0) {
      return errors.validationError(c, { title: "Title is required" });
    }

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadFile(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      `schools/${schoolId}`
    );

    // Create database record
    const sharedFile = await db.sharedFile.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        storedName: uploadResult.storedName,
        originalName: file.name,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        url: uploadResult.url,
        ...(isStudent
          ? { uploadedByStudentId: userId }
          : { uploadedByUserId: userId }),
        schoolId,
      },
    });

    // If recipients were provided, share immediately
    if (recipientsRaw) {
      try {
        const recipients = JSON.parse(recipientsRaw);
        await shareFileWithRecipients(sharedFile.id, recipients, schoolId, (user as any)?.name || "Unknown");
      } catch {
        // File uploaded successfully, sharing failed — not critical
        console.error("Failed to share file with recipients");
      }
    }

    return successResponse(c, sharedFile, 201);
  } catch (error) {
    console.error("Upload error:", error);
    return errors.internalError(c);
  }
});

// GET /shared-files — List files visible to the current user
staffRoutes.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const role = c.get("role");
    const isStudent = role === ("STUDENT" as any);

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";

    // Build ownership/recipient filter based on user type
    const ownershipFilter = isStudent
      ? [
          { uploadedByStudentId: userId },
          {
            recipients: {
              some: {
                OR: [
                  { recipientStudentId: userId },
                  { recipientType: "ROLE" as const, recipientRole: "STUDENT" },
                ],
              },
            },
          },
        ]
      : [
          { uploadedByUserId: userId },
          {
            recipients: {
              some: {
                OR: [
                  { recipientUserId: userId },
                  { recipientType: "ROLE" as const, recipientRole: role },
                ],
              },
            },
          },
        ];

    // Files shared with this user directly OR with their role, OR files they uploaded
    const where = {
      schoolId,
      OR: ownershipFilter,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { originalName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    // If search is provided, use AND to combine both conditions
    const finalWhere = search
      ? {
          AND: [
            {
              schoolId,
              OR: ownershipFilter,
            },
            {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
                { originalName: { contains: search, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : where;

    const [files, total] = await Promise.all([
      db.sharedFile.findMany({
        where: finalWhere,
        include: {
          uploadedByUser: { select: { id: true, name: true, role: true } },
          uploadedByStudent: { select: { id: true, firstName: true, lastName: true } },
          uploadedByParent: { select: { id: true, name: true } },
          recipients: {
            select: {
              id: true,
              recipientType: true,
              recipientRole: true,
              recipientUser: { select: { id: true, name: true } },
              recipientStudent: { select: { id: true, firstName: true, lastName: true } },
              recipientParent: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sharedFile.count({ where: finalWhere }),
    ]);

    return successResponse(c, {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List files error:", error);
    return errors.internalError(c);
  }
});

// GET /shared-files/:id — Get single file details
staffRoutes.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");

    const file = await db.sharedFile.findFirst({
      where: { id: fileId, schoolId },
      include: {
        uploadedByUser: { select: { id: true, name: true, role: true } },
        uploadedByStudent: { select: { id: true, firstName: true, lastName: true } },
        uploadedByParent: { select: { id: true, name: true } },
        recipients: {
          include: {
            recipientUser: { select: { id: true, name: true, role: true } },
            recipientStudent: { select: { id: true, firstName: true, lastName: true } },
            recipientParent: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!file) {
      return errors.notFound(c, "File");
    }

    return successResponse(c, file);
  } catch (error) {
    console.error("Get file error:", error);
    return errors.internalError(c);
  }
});

// GET /shared-files/:id/download — Get a pre-signed download URL
staffRoutes.get("/:id/download", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");

    const file = await db.sharedFile.findFirst({
      where: { id: fileId, schoolId },
    });

    if (!file) {
      return errors.notFound(c, "File");
    }

    const downloadUrl = await getDownloadUrl(file.storedName, file.originalName);
    return successResponse(c, { downloadUrl, fileName: file.originalName });
  } catch (error) {
    console.error("Download URL error:", error);
    return errors.internalError(c);
  }
});

// GET /shared-files/:id/view — Get a pre-signed view URL
staffRoutes.get("/:id/view", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");

    const file = await db.sharedFile.findFirst({
      where: { id: fileId, schoolId },
    });

    if (!file) {
      return errors.notFound(c, "File");
    }

    const viewUrl = await getViewUrl(file.storedName);
    return successResponse(c, { viewUrl, fileName: file.originalName, mimeType: file.mimeType });
  } catch (error) {
    console.error("View URL error:", error);
    return errors.internalError(c);
  }
});

// POST /shared-files/:id/share — Share a file with more recipients
staffRoutes.post("/:id/share", zValidator("json", shareSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const user = c.get("user");
    const fileId = c.req.param("id");
    const { recipients } = c.req.valid("json");

    const file = await db.sharedFile.findFirst({
      where: { id: fileId, schoolId },
    });

    if (!file) {
      return errors.notFound(c, "File");
    }

    await shareFileWithRecipients(fileId, recipients, schoolId, (user as any)?.name || "Unknown");

    return successResponse(c, { message: "File shared successfully" });
  } catch (error) {
    console.error("Share file error:", error);
    return errors.internalError(c);
  }
});

// DELETE /shared-files/:id — Delete a file (admin or uploader only)
staffRoutes.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const role = c.get("role");
    const fileId = c.req.param("id");

    const file = await db.sharedFile.findFirst({
      where: { id: fileId, schoolId },
    });

    if (!file) {
      return errors.notFound(c, "File");
    }

    // Only uploader or ADMIN can delete
    const isUploader = file.uploadedByUserId === userId || file.uploadedByStudentId === userId;
    if (!isUploader && role !== "ADMIN") {
      return errors.forbidden(c);
    }

    // Delete from R2
    await deleteFile(file.storedName);

    // Delete from database (cascades to recipients)
    await db.sharedFile.delete({ where: { id: fileId } });

    return successResponse(c, { message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return errors.internalError(c);
  }
});

// GET /shared-files/search/users — Search users/students/parents for sharing
staffRoutes.get("/search/users", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const query = c.req.query("q") || "";

    if (query.length < 2) {
      return successResponse(c, { results: [] });
    }

    const [users, students, parents] = await Promise.all([
      db.user.findMany({
        where: {
          schoolId,
          name: { contains: query, mode: "insensitive" },
          isActive: true,
        },
        select: { id: true, name: true, role: true, email: true },
        take: 10,
      }),
      db.student.findMany({
        where: {
          schoolId,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
          status: "ACTIVE",
        },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        take: 10,
      }),
      db.parent.findMany({
        where: {
          schoolId,
          name: { contains: query, mode: "insensitive" },
          isActive: true,
        },
        select: { id: true, name: true, email: true },
        take: 10,
      }),
    ]);

    const results = [
      ...users.map((u) => ({ type: "USER" as const, id: u.id, label: u.name, subtitle: u.role })),
      ...students.map((s) => ({
        type: "STUDENT" as const,
        id: s.id,
        label: `${s.firstName} ${s.lastName}`,
        subtitle: s.admissionNumber,
      })),
      ...parents.map((p) => ({ type: "PARENT" as const, id: p.id, label: p.name, subtitle: "Parent" })),
    ];

    return successResponse(c, { results });
  } catch (error) {
    console.error("Search users error:", error);
    return errors.internalError(c);
  }
});

// ─── Parent Routes ───────────────────────────────────────────

const parentRoutes = new Hono();
parentRoutes.use("*", requireParentAuth);

parentRoutes.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const parentId = c.get("parentId");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");

    const where = {
      schoolId,
      OR: [
        { uploadedByParentId: parentId },
        {
          recipients: {
            some: {
              OR: [
                { recipientParentId: parentId },
                { recipientType: "ROLE" as const, recipientRole: "PARENT" },
              ],
            },
          },
        },
      ],
    };

    const [files, total] = await Promise.all([
      db.sharedFile.findMany({
        where,
        include: {
          uploadedByUser: { select: { id: true, name: true, role: true } },
          uploadedByParent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sharedFile.count({ where }),
    ]);

    return successResponse(c, { files, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Parent list files error:", error);
    return errors.internalError(c);
  }
});

parentRoutes.get("/:id/download", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");
    const file = await db.sharedFile.findFirst({ where: { id: fileId, schoolId } });
    if (!file) return errors.notFound(c, "File");
    const downloadUrl = await getDownloadUrl(file.storedName, file.originalName);
    return successResponse(c, { downloadUrl, fileName: file.originalName });
  } catch (error) {
    console.error("Parent download error:", error);
    return errors.internalError(c);
  }
});

parentRoutes.get("/:id/view", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");
    const file = await db.sharedFile.findFirst({ where: { id: fileId, schoolId } });
    if (!file) return errors.notFound(c, "File");
    const viewUrl = await getViewUrl(file.storedName);
    return successResponse(c, { viewUrl, fileName: file.originalName, mimeType: file.mimeType });
  } catch (error) {
    console.error("Parent view error:", error);
    return errors.internalError(c);
  }
});

// ─── Student Routes ──────────────────────────────────────────

const studentRoutes = new Hono();
studentRoutes.use("*", requireStudentAuth);

studentRoutes.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const studentId = c.get("studentId");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");

    const where = {
      schoolId,
      OR: [
        { uploadedByStudentId: studentId },
        {
          recipients: {
            some: {
              OR: [
                { recipientStudentId: studentId },
                { recipientType: "ROLE" as const, recipientRole: "STUDENT" },
              ],
            },
          },
        },
      ],
    };

    const [files, total] = await Promise.all([
      db.sharedFile.findMany({
        where,
        include: {
          uploadedByUser: { select: { id: true, name: true, role: true } },
          uploadedByStudent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sharedFile.count({ where }),
    ]);

    return successResponse(c, { files, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Student list files error:", error);
    return errors.internalError(c);
  }
});

studentRoutes.get("/:id/download", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");
    const file = await db.sharedFile.findFirst({ where: { id: fileId, schoolId } });
    if (!file) return errors.notFound(c, "File");
    const downloadUrl = await getDownloadUrl(file.storedName, file.originalName);
    return successResponse(c, { downloadUrl, fileName: file.originalName });
  } catch (error) {
    console.error("Student download error:", error);
    return errors.internalError(c);
  }
});

studentRoutes.get("/:id/view", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const fileId = c.req.param("id");
    const file = await db.sharedFile.findFirst({ where: { id: fileId, schoolId } });
    if (!file) return errors.notFound(c, "File");
    const viewUrl = await getViewUrl(file.storedName);
    return successResponse(c, { viewUrl, fileName: file.originalName, mimeType: file.mimeType });
  } catch (error) {
    console.error("Student view error:", error);
    return errors.internalError(c);
  }
});

// ─── Helper: Share file with recipients and send notifications ─

async function shareFileWithRecipients(
  fileId: string,
  recipients: Array<{ type: string; id?: string; role?: string }>,
  schoolId: string,
  sharedByName: string
) {
  const file = await db.sharedFile.findUnique({ where: { id: fileId } });
  if (!file) return;

  for (const recipient of recipients) {
    try {
      if (recipient.type === "ROLE" && recipient.role) {
        // Share with all users of a role
        await db.sharedFileRecipient.upsert({
          where: { fileId_recipientRole: { fileId, recipientRole: recipient.role } },
          create: {
            fileId,
            recipientType: "ROLE",
            recipientRole: recipient.role,
          },
          update: {},
        });

        // Create notifications for all users with that role
        if (recipient.role === "PARENT") {
          const parents = await db.parent.findMany({
            where: { schoolId, isActive: true },
            select: { id: true },
          });
          // Parents don't have user-linked notifications in the current model
          // We'd create system-level notifications if needed
        } else if (recipient.role === "STUDENT") {
          // Students similarly don't have user-linked notifications
        } else {
          // Staff roles (ADMIN, TEACHER, RECEPTIONIST)
          const users = await db.user.findMany({
            where: { schoolId, role: recipient.role as any, isActive: true },
            select: { id: true },
          });
          if (users.length > 0) {
            await db.notification.createMany({
              data: users.map((u) => ({
                title: "New shared file",
                message: `${sharedByName} shared "${file.title}" with all ${recipient.role}s`,
                type: "SHARED_FILE" as const,
                priority: "LOW" as const,
                userId: u.id,
                schoolId,
                actionUrl: `/dashboard/shared-files`,
              })),
            });
          }
        }
      } else if (recipient.type === "USER" && recipient.id) {
        await db.sharedFileRecipient.upsert({
          where: { fileId_recipientUserId: { fileId, recipientUserId: recipient.id } },
          create: {
            fileId,
            recipientType: "USER",
            recipientUserId: recipient.id,
          },
          update: {},
        });

        await db.notification.create({
          data: {
            title: "New shared file",
            message: `${sharedByName} shared "${file.title}" with you`,
            type: "SHARED_FILE",
            priority: "LOW",
            userId: recipient.id,
            schoolId,
            actionUrl: `/dashboard/shared-files`,
          },
        });
      } else if (recipient.type === "STUDENT" && recipient.id) {
        await db.sharedFileRecipient.upsert({
          where: { fileId_recipientStudentId: { fileId, recipientStudentId: recipient.id } },
          create: {
            fileId,
            recipientType: "STUDENT",
            recipientStudentId: recipient.id,
          },
          update: {},
        });
      } else if (recipient.type === "PARENT" && recipient.id) {
        await db.sharedFileRecipient.upsert({
          where: { fileId_recipientParentId: { fileId, recipientParentId: recipient.id } },
          create: {
            fileId,
            recipientType: "PARENT",
            recipientParentId: recipient.id,
          },
          update: {},
        });
      }
    } catch (err) {
      console.error(`Failed to share with recipient:`, recipient, err);
    }
  }
}

// ─── Mount sub-routes ────────────────────────────────────────

sharedFiles.route("/staff", staffRoutes);
sharedFiles.route("/parent", parentRoutes);
sharedFiles.route("/student", studentRoutes);

export default sharedFiles;
