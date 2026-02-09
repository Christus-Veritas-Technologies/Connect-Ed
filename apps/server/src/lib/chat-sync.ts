/**
 * Chat member synchronization utility.
 * Ensures every class chat room has the correct members:
 * - All students in the class
 * - All teachers assigned to the class (TeacherClass) + class teacher
 * - All parents of students in the class
 * - All admins of the school (admins are in every chat)
 */
import { db, Role } from "@repo/db";

export async function syncChatMembers(classId: string): Promise<void> {
  const classData = await db.class.findUnique({
    where: { id: classId },
    include: {
      school: {
        include: {
          users: {
            where: { role: Role.ADMIN, isActive: true },
            select: { id: true, name: true },
          },
        },
      },
      students: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          parentId: true,
          parent: { select: { id: true, name: true } },
        },
      },
      teachers: {
        select: {
          teacher: { select: { id: true, name: true } },
        },
      },
      classTeacher: { select: { id: true, name: true } },
    },
  });

  if (!classData) return;

  // Build the desired member set
  const desiredMembers: Array<{
    classId: string;
    memberType: string;
    memberId: string;
    role: string;
    name: string;
  }> = [];

  // 1. Admins
  for (const admin of classData.school.users) {
    desiredMembers.push({
      classId,
      memberType: "USER",
      memberId: admin.id,
      role: "ADMIN",
      name: admin.name,
    });
  }

  // 2. Teachers (from TeacherClass assignments)
  const teacherIds = new Set<string>();
  for (const tc of classData.teachers) {
    if (!teacherIds.has(tc.teacher.id)) {
      teacherIds.add(tc.teacher.id);
      desiredMembers.push({
        classId,
        memberType: "USER",
        memberId: tc.teacher.id,
        role: "TEACHER",
        name: tc.teacher.name,
      });
    }
  }

  // 3. Class teacher (if not already added via TeacherClass)
  if (classData.classTeacher && !teacherIds.has(classData.classTeacher.id)) {
    desiredMembers.push({
      classId,
      memberType: "USER",
      memberId: classData.classTeacher.id,
      role: "TEACHER",
      name: classData.classTeacher.name,
    });
  }

  // 4. Students
  for (const student of classData.students) {
    desiredMembers.push({
      classId,
      memberType: "STUDENT",
      memberId: student.id,
      role: "STUDENT",
      name: `${student.firstName} ${student.lastName}`,
    });

    // 5. Parents of students
    if (student.parent) {
      // Avoid duplicate parent entries
      const alreadyAdded = desiredMembers.some(
        (m) => m.memberType === "PARENT" && m.memberId === student.parent!.id
      );
      if (!alreadyAdded) {
        desiredMembers.push({
          classId,
          memberType: "PARENT",
          memberId: student.parent.id,
          role: "PARENT",
          name: student.parent.name,
        });
      }
    }
  }

  // Upsert all members (delete stale, add missing)
  await db.$transaction(async (tx) => {
    // Remove members no longer valid
    await tx.chatMember.deleteMany({
      where: {
        classId,
        NOT: {
          OR: desiredMembers.map((m) => ({
            memberType: m.memberType,
            memberId: m.memberId,
          })),
        },
      },
    });

    // Upsert each desired member
    for (const member of desiredMembers) {
      await tx.chatMember.upsert({
        where: {
          classId_memberType_memberId: {
            classId: member.classId,
            memberType: member.memberType,
            memberId: member.memberId,
          },
        },
        update: {
          name: member.name,
          role: member.role,
        },
        create: member,
      });
    }
  });
}

/**
 * Sync chat members for ALL classes in a school.
 * Useful after bulk operations (e.g., student import, teacher assignment).
 */
export async function syncAllChatMembers(schoolId: string): Promise<void> {
  const classes = await db.class.findMany({
    where: { schoolId },
    select: { id: true },
  });

  for (const cls of classes) {
    await syncChatMembers(cls.id);
  }
}
