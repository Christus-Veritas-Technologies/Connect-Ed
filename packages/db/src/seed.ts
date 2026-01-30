import { PrismaClient, Plan, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo school with all data
  const school = await prisma.school.create({
    data: {
      name: "Demo School",
      plan: Plan.GROWTH,
      isActive: true,
      signupFeePaid: true,
      onboardingComplete: true,
      studentCount: 150,
      teacherCount: 10,
      emailQuota: 500,
      whatsappQuota: 500,
      smsQuota: 300,
    },
  });

  console.log(`✅ Created school: ${school.name}`);

  // Create admin user
  const adminPassword = await hash("Admin123!", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@demo-school.com",
      password: adminPassword,
      name: "John Administrator",
      role: Role.ADMIN,
      schoolId: school.id,
    },
  });

  console.log(`✅ Created admin: ${admin.email}`);

  // Create receptionist
  const receptionistPassword = await hash("Reception123!", 12);
  const receptionist = await prisma.user.create({
    data: {
      email: "reception@demo-school.com",
      password: receptionistPassword,
      name: "Sarah Reception",
      role: Role.RECEPTIONIST,
      schoolId: school.id,
    },
  });

  console.log(`✅ Created receptionist: ${receptionist.email}`);

  // Create teacher
  const teacherPassword = await hash("Teacher123!", 12);
  const teacher = await prisma.user.create({
    data: {
      email: "teacher@demo-school.com",
      password: teacherPassword,
      name: "Mr. James Teacher",
      role: Role.TEACHER,
      schoolId: school.id,
    },
  });

  console.log(`✅ Created teacher: ${teacher.email}`);

  // Create classes
  const class5A = await prisma.class.create({
    data: {
      name: "Grade 5A",
      schoolId: school.id,
      classTeacherId: teacher.id,
    },
  });

  const class5B = await prisma.class.create({
    data: {
      name: "Grade 5B",
      schoolId: school.id,
    },
  });

  console.log(`✅ Created classes: ${class5A.name}, ${class5B.name}`);

  // Create subjects
  const subjects = await Promise.all([
    prisma.subject.create({
      data: { name: "Mathematics", code: "MATH", schoolId: school.id },
    }),
    prisma.subject.create({
      data: { name: "English", code: "ENG", schoolId: school.id },
    }),
    prisma.subject.create({
      data: { name: "Science", code: "SCI", schoolId: school.id },
    }),
  ]);

  console.log(`✅ Created ${subjects.length} subjects`);

  // Create parent (for enterprise features demo)
  const parentPassword = await hash("Parent123!", 12);
  const parent = await prisma.parent.create({
    data: {
      email: "parent@demo-school.com",
      password: parentPassword,
      name: "Mrs. Jane Parent",
      phone: "+1234567890",
      schoolId: school.id,
    },
  });

  console.log(`✅ Created parent: ${parent.email}`);

  // Create students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        firstName: "Alice",
        lastName: "Johnson",
        admissionNumber: "STU-2024-001",
        classId: class5A.id,
        parentId: parent.id,
        schoolId: school.id,
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Bob",
        lastName: "Smith",
        admissionNumber: "STU-2024-002",
        classId: class5A.id,
        schoolId: school.id,
      },
    }),
    prisma.student.create({
      data: {
        firstName: "Carol",
        lastName: "Williams",
        admissionNumber: "STU-2024-003",
        classId: class5B.id,
        schoolId: school.id,
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students`);

  // Create fees for students
  const fees = await Promise.all(
    students.map((student) =>
      prisma.fee.create({
        data: {
          amount: 500,
          description: "Term 1 Tuition Fee",
          dueDate: new Date("2024-02-15"),
          studentId: student.id,
          schoolId: school.id,
        },
      })
    )
  );

  console.log(`✅ Created ${fees.length} fee records`);

  // Create some expenses
  const expenses = await Promise.all([
    prisma.expense.create({
      data: {
        amount: 150,
        category: "Supplies",
        description: "Classroom materials and stationery",
        date: new Date("2024-01-15"),
        recordedById: admin.id,
        schoolId: school.id,
      },
    }),
    prisma.expense.create({
      data: {
        amount: 500,
        category: "Utilities",
        description: "Monthly electricity bill",
        date: new Date("2024-01-20"),
        recordedById: admin.id,
        schoolId: school.id,
      },
    }),
  ]);

  console.log(`✅ Created ${expenses.length} expense records`);

  // Create a completed school payment
  await prisma.schoolPayment.create({
    data: {
      amount: 750 + 30, // Signup fee + first month
      type: "SIGNUP_FEE",
      status: "COMPLETED",
      paymentMethod: "ONLINE",
      reference: "dodo_session_demo123",
      schoolId: school.id,
    },
  });

  console.log(`✅ Created school payment record`);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📝 Demo credentials:");
  console.log("   Admin: admin@demo-school.com / Admin123!");
  console.log("   Reception: reception@demo-school.com / Reception123!");
  console.log("   Teacher: teacher@demo-school.com / Teacher123!");
  console.log("   Parent: parent@demo-school.com / Parent123!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
