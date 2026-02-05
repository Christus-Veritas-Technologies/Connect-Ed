"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  ArrowLeft01Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCreateStudent } from "@/lib/hooks";
import { useClasses } from "@/lib/hooks/use-classes";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassWithLevel = {
  id: string;
  name: string;
  level?: string | null;
  _count?: { students: number };
};

export default function NewStudentPage() {
  const router = useRouter();
  const { school } = useAuth();
  const { data: classesData, isLoading: loadingClasses } = useClasses();
  const createMutation = useCreateStudent();

  const [classSearch, setClassSearch] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    classId: "",
    email: "",
    phone: "",
  });

  // Filter and group classes
  const allClasses = classesData?.classes || [];
  const filteredClasses = classSearch
    ? allClasses.filter((c: ClassWithLevel) =>
        c.name.toLowerCase().includes(classSearch.toLowerCase())
      )
    : allClasses;

  const primaryClasses = filteredClasses.filter(
    (c: ClassWithLevel) => c.level?.toLowerCase() === "primary"
  );
  const secondaryClasses = filteredClasses.filter(
    (c: ClassWithLevel) => c.level?.toLowerCase() === "secondary"
  );
  const otherClasses = filteredClasses.filter(
    (c: ClassWithLevel) =>
      !c.level ||
      (c.level.toLowerCase() !== "primary" &&
        c.level.toLowerCase() !== "secondary")
  );

  // Generate Student ID
  const generateStudentId = () => {
    const schoolPrefix = (school?.name || "SCH")
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X");
    const year = new Date().getFullYear();
    const uuid = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${schoolPrefix}-${year}-${uuid}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentId = generateStudentId();
    const payload = {
      ...formData,
      admissionNumber: studentId,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        router.push("/dashboard/students");
      },
    });
  };

  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error?.message;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-lg"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand to-purple-600">
              <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-white" />
            </div>
            Add New Student
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill in the student&apos;s information to create their account
          </p>
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {loadingClasses ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="rounded-lg"
                        placeholder="John"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="rounded-lg"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) =>
                          setFormData({ ...formData, dateOfBirth: e.target.value })
                        }
                        className="rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData({ ...formData, gender: value })
                        }
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select gender..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Contact Information (Optional)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="rounded-lg"
                        placeholder="john.doe@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Phone</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="rounded-lg"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Academic Information
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Class <span className="text-destructive">*</span>
                    </Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search classes..."
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        className="rounded-lg"
                      />
                      <Select
                        value={formData.classId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, classId: value })
                        }
                        required
                      >
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Select class..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {primaryClasses.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                PRIMARY
                              </div>
                              {primaryClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                  {cls._count?.students !== undefined && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({cls._count.students} students)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {secondaryClasses.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                                SECONDARY
                              </div>
                              {secondaryClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                  {cls._count?.students !== undefined && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({cls._count.students} students)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {otherClasses.length > 0 && (
                            <>
                              {(primaryClasses.length > 0 ||
                                secondaryClasses.length > 0) && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                                  OTHER
                                </div>
                              )}
                              {otherClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                  {cls._count?.students !== undefined && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({cls._count.students} students)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {filteredClasses.length === 0 && (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              No classes found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Student ID will be auto-generated upon creation
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-lg gap-2"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={Add01Icon} size={18} />
                        Create Student
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
