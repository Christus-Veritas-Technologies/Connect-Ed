"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PRICING, getPlanAmounts } from "@/lib/pricing";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";
import {
  useSchoolSettings,
  useUpdateSchool,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useUserProfile,
  useUpdateProfile,
  useSchoolUsers,
} from "@/lib/hooks";
import { useSubjects } from "@/lib/hooks/use-subjects";
import {
  useGrades,
  useCreateGrade,
  useDeleteGrade,
  type Grade,
} from "@/lib/hooks/use-exams";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Smartphone,
  BellRing,
  Loader2,
  Save,
  Globe,
  Phone,
  MapPin,
  Copy,
  Check,
  BarChart3,
  User,
} from "lucide-react";
import { DashboardBreadcrumbs, FilterTabs } from "@/components/dashboard";

const PLAN_SEAT_LIMITS = {
  LITE: 10,
  GROWTH: 30,
  ENTERPRISE: 300,
} as const;

type PlanSeatKey = keyof typeof PLAN_SEAT_LIMITS;

type QuotaMetric = {
  label: string;
  used: number;
  limit: number;
  unit: string;
  helper: string;
};

export default function SettingsPage() {
  const { school: authSchool, user, checkAuth } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Data hooks
  const { data: schoolData, isLoading: schoolLoading } = useSchoolSettings();
  const { data: notifData, isLoading: notifLoading } = useNotificationPrefs();
  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const { data: usersData } = useSchoolUsers();
  const { data: subjectsData } = useSubjects();
  const { data: gradesData, isLoading: gradesLoading } = useGrades();

  // Mutations
  const updateSchool = useUpdateSchool();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const updateProfile = useUpdateProfile();
  const createGrade = useCreateGrade();
  const deleteGrade = useDeleteGrade();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? "school" : "profile");

  // School form state
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });

  // Grade form state
  const [gradeForm, setGradeForm] = useState({
    name: "",
    minMark: "",
    maxMark: "",
    isPass: true,
  });
  const [showGradeForm, setShowGradeForm] = useState(false);

  // Copy ID state
  const [copied, setCopied] = useState(false);

  // Sync school form when data loads
  useEffect(() => {
    if (schoolData?.school) {
      const s = schoolData.school;
      setSchoolForm({
        name: s.name || "",
        address: s.address || "",
        phone: s.phone || "",
        email: s.email || "",
        website: s.website || "",
      });
    }
  }, [schoolData]);

  // Sync profile form when data loads
  useEffect(() => {
    if (profileData?.user) {
      const u = profileData.user;
      setProfileForm({
        name: u.name || "",
        phone: u.phone || "",
      });
    }
  }, [profileData]);

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSchool.mutateAsync(schoolForm);
      await checkAuth();
      toast.success("School information updated");
    } catch {
      toast.error("Failed to update school information");
    }
  };

  const handleToggleNotification = async (
    key: "notifyEmail" | "notifyWhatsapp" | "notifySms" | "notifyInApp",
    value: boolean
  ) => {
    try {
      await updateNotifPrefs.mutateAsync({ [key]: value });
      toast.success("Notification preference updated");
    } catch {
      toast.error("Failed to update notification preference");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(profileForm);
      await checkAuth();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleToggleUserPref = async (
    key: "notifyInApp" | "notifyEmail",
    value: boolean
  ) => {
    try {
      await updateProfile.mutateAsync({ [key]: value });
      toast.success("Preference updated");
    } catch {
      toast.error("Failed to update preference");
    }
  };

  const handleCopyId = async () => {
    if (authSchool?.id) {
      await navigator.clipboard.writeText(authSchool.id);
      setCopied(true);
      toast.success("School ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.name || !gradeForm.minMark || !gradeForm.maxMark) {
      toast.error("Please fill in all fields");
      return;
    }

    const minMark = parseInt(gradeForm.minMark);
    const maxMark = parseInt(gradeForm.maxMark);

    if (minMark < 0 || minMark > 100 || maxMark < 0 || maxMark > 100) {
      toast.error("Marks must be between 0 and 100");
      return;
    }

    if (minMark > maxMark) {
      toast.error("Starting mark cannot be greater than ending mark");
      return;
    }

    try {
      await createGrade.mutateAsync({
        name: gradeForm.name,
        minMark,
        maxMark,
        isPass: gradeForm.isPass,
      } as any);
      toast.success("Grade created successfully");
      setGradeForm({
        name: "",
        minMark: "",
        maxMark: "",
        isPass: true,
      });
      setShowGradeForm(false);
    } catch (error) {
      toast.error("Failed to create grade");
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    if (!confirm("Delete this grade? This cannot be undone.")) return;
    try {
      await deleteGrade.mutateAsync(gradeId);
      toast.success("Grade deleted");
    } catch (error) {
      toast.error("Failed to delete grade");
    }
  };

  const prefs = notifData?.preferences;
  const profile = profileData?.user;
  const planPricing = authSchool?.plan ? PRICING[authSchool.plan] : null;
  const schoolCurrency = (authSchool?.currency ?? "USD") as CurrencyCode;
  const planAmounts = authSchool?.plan ? getPlanAmounts(authSchool.plan, schoolCurrency) : null;

  const notificationChannels = [
    {
      key: "notifyEmail" as const,
      label: "Email Notifications",
      description:
        "Receive notifications via email (welcome emails, reports, alerts)",
      icon: Mail,
      enabled: prefs?.notifyEmail ?? true,
    },
    {
      key: "notifyWhatsapp" as const,
      label: "WhatsApp Notifications",
      description: "Receive notifications via WhatsApp messages",
      icon: MessageSquare,
      enabled: prefs?.notifyWhatsapp ?? true,
    },
    {
      key: "notifySms" as const,
      label: "SMS Notifications",
      description: "Receive notifications via text messages",
      icon: Smartphone,
      enabled: prefs?.notifySms ?? true,
    },
    {
      key: "notifyInApp" as const,
      label: "In-App Notifications",
      description:
        "Show notification badges and alerts within the platform",
      icon: BellRing,
      enabled: prefs?.notifyInApp ?? true,
    },
  ];

  const planKey = (authSchool?.plan ?? "LITE") as PlanSeatKey;
  const seatLimit = PLAN_SEAT_LIMITS[planKey] ?? 0;
  const totalTeamMembers = usersData?.users?.length ?? 0;

  const channelQuotaFields = [
    {
      label: "Emails",
      used: authSchool?.emailUsed ?? 0,
      limit: authSchool?.emailQuota ?? planPricing?.quotas?.email,
      unit: "emails",
      helper: "Monthly email quota",
    },
    {
      label: "WhatsApp messages",
      used: authSchool?.whatsappUsed ?? 0,
      limit: authSchool?.whatsappQuota ?? planPricing?.quotas?.whatsapp,
      unit: "messages",
      helper: "Monthly WhatsApp quota",
    },
    {
      label: "SMS messages",
      used: authSchool?.smsUsed ?? 0,
      limit: authSchool?.smsQuota ?? planPricing?.quotas?.sms,
      unit: "messages",
      helper: "Monthly SMS quota",
    },
  ];

  const quotaMetrics: QuotaMetric[] = [
    ...(seatLimit > 0
      ? [
        {
          label: "Team seats",
          used: totalTeamMembers,
          limit: seatLimit,
          unit: "accounts",
          helper: "Admin, receptionist & teacher seats",
        },
      ]
      : []),
    ...channelQuotaFields
      .map((entry) => {
        if (!entry.limit) return null;
        return {
          label: entry.label,
          used: entry.used,
          limit: entry.limit,
          unit: entry.unit,
          helper: entry.helper,
        };
      })
      .filter((metric): metric is QuotaMetric => Boolean(metric)),
  ];

  const quotaResetLabel = authSchool?.quotaResetDate
    ? `Resets ${new Date(authSchool.quotaResetDate).toLocaleDateString()}`
    : "Resets monthly";

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs items={[{ label: "Settings" }]} />

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Personalize your account and manage preferences securely.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Tab Navigation */}
        <FilterTabs
          tabs={[
            ...(isAdmin ? [{ key: "school", label: "School" }] : []),
            ...(isAdmin ? [{ key: "marks", label: "Marks" }] : []),
            ...(isAdmin ? [{ key: "notifications", label: "Notifications" }] : []),
            { key: "profile", label: "Profile" },
            ...(isAdmin ? [{ key: "billing", label: "Billing" }] : []),
            ...(isAdmin ? [{ key: "users", label: "Users" }] : []),
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* =============================================
            School Data Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="school" className="space-y-8">
            {/* School Information Section */}
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-muted p-2">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Workspace Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Basic workspace info details
                  </p>
                </div>
              </div>

              {schoolLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleUpdateSchool} className="space-y-4 max-w-2xl">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="text-sm font-medium">School Name</Label>
                      <Input
                        id="schoolName"
                        value={schoolForm.name}
                        onChange={(e) =>
                          setSchoolForm({
                            ...schoolForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter school name"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolEmail" className="text-sm font-medium">Email</Label>
                      <Input
                        id="schoolEmail"
                        type="email"
                        value={schoolForm.email}
                        onChange={(e) =>
                          setSchoolForm({
                            ...schoolForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="contact@school.com"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolPhone" className="text-sm font-medium">Phone</Label>
                      <Input
                        id="schoolPhone"
                        type="tel"
                        value={schoolForm.phone}
                        onChange={(e) =>
                          setSchoolForm({
                            ...schoolForm,
                            phone: e.target.value,
                          })
                        }
                        placeholder="+234..."
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolAddress" className="text-sm font-medium">Address</Label>
                      <Input
                        id="schoolAddress"
                        value={schoolForm.address}
                        onChange={(e) =>
                          setSchoolForm({
                            ...schoolForm,
                            address: e.target.value,
                          })
                        }
                        placeholder="Enter school address"
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolWebsite" className="text-sm font-medium">Website</Label>
                      <Input
                        id="schoolWebsite"
                        type="url"
                        value={schoolForm.website}
                        onChange={(e) =>
                          setSchoolForm({
                            ...schoolForm,
                            website: e.target.value,
                          })
                        }
                        placeholder="https://www.school.com"
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateSchool.isPending}
                      className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                    >
                      {updateSchool.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Save
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <Separator />

            {/* School ID Section */}
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-muted p-2">
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">School ID</h3>
                  <p className="text-sm text-muted-foreground">
                    Use this ID when making cash payments
                  </p>
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={authSchool?.id || ""}
                      disabled
                      className="font-mono text-sm bg-muted flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyId}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* =============================================
            Marks/Grades Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="marks" className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-muted p-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Grading System</h3>
                  <p className="text-sm text-muted-foreground">
                    Define grade ranges and pass/fail criteria that apply across all subjects in your school
                  </p>
                </div>
              </div>

              {gradesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Grade Definitions</CardTitle>
                        <CardDescription>
                          Configure grade ranges (e.g., A: 90-100, B: 80-89) that apply to all subjects across your school
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowGradeForm(!showGradeForm)}
                        size="sm"
                      >
                        {showGradeForm ? "Cancel" : "Add Grade"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Grade Form */}
                    {showGradeForm && (
                      <form onSubmit={handleCreateGrade} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="gradeName">Grade Symbol</Label>
                            <Input
                              id="gradeName"
                              value={gradeForm.name}
                              onChange={(e) =>
                                setGradeForm({ ...gradeForm, name: e.target.value })
                              }
                              placeholder="e.g., A, B+, C"
                              className="bg-background"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="gradeMin">Starting Mark (%)</Label>
                            <Input
                              id="gradeMin"
                              type="number"
                              min={0}
                              max={100}
                              value={gradeForm.minMark}
                              onChange={(e) =>
                                setGradeForm({ ...gradeForm, minMark: e.target.value })
                              }
                              placeholder="e.g., 90"
                              className="bg-background"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="gradeMax">Ending Mark (%)</Label>
                            <Input
                              id="gradeMax"
                              type="number"
                              min={0}
                              max={100}
                              value={gradeForm.maxMark}
                              onChange={(e) =>
                                setGradeForm({ ...gradeForm, maxMark: e.target.value })
                              }
                              placeholder="e.g., 100"
                              className="bg-background"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="gradePass">Status</Label>
                            <div className="flex items-center gap-2 pt-2">
                              <Switch
                                id="gradePass"
                                checked={gradeForm.isPass}
                                onCheckedChange={(checked) =>
                                  setGradeForm({ ...gradeForm, isPass: checked })
                                }
                              />
                              <Label htmlFor="gradePass" className="cursor-pointer text-sm">
                                {gradeForm.isPass ? "Passing grade" : "Failing grade"}
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowGradeForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createGrade.isPending}>
                            {createGrade.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Creating...
                              </>
                            ) : (
                              "Create Grade"
                            )}
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Grades List by Subject */}
                    {(!gradesData?.grades || gradesData.grades.length === 0) && !showGradeForm ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium mb-1">No grades defined yet</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Create grade ranges to enable automatic grading across all subjects
                        </p>
                        <Button onClick={() => setShowGradeForm(true)} size="sm">
                          Add Your First Grade
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(gradesData?.grades || [])
                          .sort((a: Grade, b: Grade) => b.minMark - a.minMark)
                          .map((grade: Grade) => (
                            <div
                              key={grade.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="font-bold text-lg text-brand min-w-10">
                                  {grade.name}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Range:</span>
                                  <span className="font-medium">
                                    {grade.minMark}% - {grade.maxMark}%
                                  </span>
                                </div>
                                <Badge
                                  variant={grade.isPass ? "success" : "destructive"}
                                  className="text-xs"
                                >
                                  {grade.isPass ? "Pass" : "Fail"}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGrade(grade.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {/* =============================================
            Notifications Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="notifications" className="space-y-8">
            {/* Notification Channels Section */}
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-lg bg-muted p-2">
                  <BellRing className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Notification Channels</h3>
                  <p className="text-sm text-muted-foreground">
                    Control which notification channels are enabled for your school
                  </p>
                </div>
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-0 max-w-2xl">
                  {notificationChannels.map((channel, index) => (
                    <div key={channel.key}>
                      <div className="flex items-center justify-between py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-muted/50 p-2">
                            <channel.icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-foreground cursor-pointer">
                              {channel.label}
                            </Label>
                            <p className="text-sm text-muted-foreground leading-snug">
                              {channel.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={channel.enabled}
                          onCheckedChange={(value) =>
                            handleToggleNotification(channel.key, value)
                          }
                          disabled={updateNotifPrefs.isPending}
                        />
                      </div>
                      {index < notificationChannels.length - 1 && (
                        <Separator />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Quota Usage Section */}
            {schoolData?.school && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-muted p-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Notification Quota</h3>
                    <p className="text-sm text-muted-foreground">
                      Your current usage for this billing period
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
                  <QuotaItem
                    label="Emails"
                    used={schoolData.school.emailUsed}
                    total={schoolData.school.emailQuota}
                    icon={Mail}
                  />
                  <QuotaItem
                    label="WhatsApp"
                    used={schoolData.school.whatsappUsed}
                    total={schoolData.school.whatsappQuota}
                    icon={MessageSquare}
                  />
                  <QuotaItem
                    label="SMS"
                    used={schoolData.school.smsUsed}
                    total={schoolData.school.smsQuota}
                    icon={Smartphone}
                  />
                </div>
                {schoolData.school.quotaResetDate && (
                  <p className="text-xs text-muted-foreground">
                    Quota resets on{" "}
                    {new Date(
                      schoolData.school.quotaResetDate
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* =============================================
            Profile Tab (All users)
        ============================================= */}
        <TabsContent value="profile" className="space-y-8">
          {/* Profile Settings Section */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-muted p-2">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your personal information
                </p>
              </div>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-2xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileName" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="profileName"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Your name"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileEmail" className="text-sm font-medium">Email</Label>
                    <Input
                      id="profileEmail"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact your admin to change your email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profilePhone" className="text-sm font-medium">Phone</Label>
                    <Input
                      id="profilePhone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+234..."
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Role</Label>
                    <div className="flex items-center h-10">
                      <Badge variant="secondary" className="text-sm">
                        {profile?.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                </div>
              </form>
            )}
          </div>

          <Separator />

          {/* User-level notification preferences */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-muted p-2">
                <BellRing className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold">My Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Control which notifications you personally receive
                </p>
              </div>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-0 max-w-2xl">
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-muted/50 p-2">
                      <BellRing className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground cursor-pointer">
                        In-App Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Show notification badges and alerts in the dashboard
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={profile?.notifyInApp ?? true}
                    onCheckedChange={(value) =>
                      handleToggleUserPref("notifyInApp", value)
                    }
                    disabled={updateProfile.isPending}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-muted/50 p-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground cursor-pointer">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Receive email alerts for important updates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={profile?.notifyEmail ?? true}
                    onCheckedChange={(value) =>
                      handleToggleUserPref("notifyEmail", value)
                    }
                    disabled={updateProfile.isPending}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* =============================================
            Billing Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <Badge
                      variant={
                        authSchool?.plan === "ENTERPRISE"
                          ? "default"
                          : authSchool?.plan === "GROWTH"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-base px-4 py-1"
                    >
                      {authSchool?.plan} Plan
                    </Badge>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {planPricing?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">
                      {planAmounts ? fmt(planAmounts.monthlyEstimate, schoolCurrency) : ""}/mo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ({planAmounts ? fmt(planAmounts.perTermCost, schoolCurrency) : ""}/term)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Plan Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
                  <div>
                    <ul className="space-y-2">
                      {planPricing?.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {quotaMetrics.length > 0 && (
                    <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Quota usage</p>
                        <p className="text-xs text-muted-foreground">{quotaResetLabel}</p>
                      </div>
                      <div className="space-y-3">
                        {quotaMetrics.map((metric) => {
                          const percent = metric.limit
                            ? Math.min(100, Math.round((metric.used / metric.limit) * 100))
                            : 0;
                          return (
                            <div
                              key={metric.label}
                              className="rounded-xl border border-border/60 bg-background/60 p-3"
                            >
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{metric.label}</span>
                                <span className="font-semibold text-foreground">
                                  {metric.limit
                                    ? `${metric.used}/${metric.limit} ${metric.unit}`
                                    : `${metric.used} ${metric.unit}`}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{metric.helper}</p>
                              {metric.limit > 0 && (
                                <div className="mt-3 h-1.5 rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-500"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {authSchool?.plan !== "ENTERPRISE" && (
                  <>
                    <Separator className="my-6" />
                    <div className="rounded-xl bg-muted/50 p-5">
                      <p className="font-semibold text-foreground">Need more features?</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade your plan to unlock additional features and
                        higher quotas.
                      </p>
                      <Button asChild>
                        <a href="/payment">Upgrade Plan</a>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Currency Setting */}
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Currency</CardTitle>
                <CardDescription>
                  Choose the currency used for fees, expenses, and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <Select
                    value={schoolCurrency}
                    onValueChange={async (value) => {
                      try {
                        await updateSchool.mutateAsync({ currency: value } as any);
                        await checkAuth();
                        toast.success("Currency updated");
                      } catch {
                        toast.error("Failed to update currency");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="ZIG">ZiG (ZiG)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    This affects how amounts are displayed across the platform.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* =============================================
            Users Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  <CardDescription>
                    Manage staff accounts for your school
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y rounded-lg border">
                  {usersData?.users?.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={u.isActive ? "default" : "secondary"}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{u.role}</Badge>
                      </div>
                    </div>
                  ))}
                  {(!usersData?.users || usersData.users.length === 0) && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No team members found. Add teachers or receptionists
                      from their respective pages.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// =============================================
// Quota Progress Item
// =============================================

function QuotaItem({
  label,
  used,
  total,
  icon: Icon,
}: {
  label: string;
  used: number;
  total: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isHigh = percentage > 80;

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={`text-sm font-medium ${isHigh ? "text-destructive" : "text-muted-foreground"
            }`}
        >
          {used}/{total}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-destructive" : "bg-primary"
            }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
