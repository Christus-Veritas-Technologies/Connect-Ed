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

  // Mutations
  const updateSchool = useUpdateSchool();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const updateProfile = useUpdateProfile();

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
          <TabsContent value="school" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">School Information</CardTitle>
                <CardDescription>
                  Update your school&apos;s details. This information is visible
                  to all members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schoolLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <form onSubmit={handleUpdateSchool} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="schoolName">School Name</Label>
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
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="schoolAddress">
                          <MapPin className="inline h-4 w-4 mr-1" />
                          Address
                        </Label>
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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="schoolPhone">
                          <Phone className="inline h-4 w-4 mr-1" />
                          Phone
                        </Label>
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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="schoolEmail">
                          <Mail className="inline h-4 w-4 mr-1" />
                          Email
                        </Label>
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
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="schoolWebsite">
                          <Globe className="inline h-4 w-4 mr-1" />
                          Website
                        </Label>
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
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>School ID</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={authSchool?.id || ""}
                          disabled
                          className="font-mono text-sm bg-muted"
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
                      <p className="text-xs text-muted-foreground">
                        Use this ID when making cash payments
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateSchool.isPending}
                        className="gap-2"
                      >
                        {updateSchool.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* =============================================
            Notifications Tab (Admin only)
        ============================================= */}
        {isAdmin && (
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Notification Channels</CardTitle>
                <CardDescription>
                  Control which notification channels are enabled for your
                  entire school. Disabling a channel will prevent{" "}
                  <strong>all</strong> notifications of that type from being
                  sent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-0">
                    {notificationChannels.map((channel, index) => (
                      <div key={channel.key}>
                        <div className="flex items-center justify-between py-5">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-xl bg-muted/50 p-2.5">
                              <channel.icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium text-foreground">
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
              </CardContent>
            </Card>

            {/* Quota Usage */}
            {schoolData?.school && (
              <Card className="border-border/60">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">Notification Quota</CardTitle>
                  <CardDescription>
                    Your current usage for this billing period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
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
                    <p className="mt-4 text-xs text-muted-foreground">
                      Quota resets on{" "}
                      {new Date(
                        schoolData.school.quotaResetDate
                      ).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* =============================================
            Profile Tab (All users)
        ============================================= */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profileName">Full Name</Label>
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileEmail">Email</Label>
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
                      <Label htmlFor="profilePhone">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone
                      </Label>
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="flex items-center h-9">
                        <Badge variant="secondary" className="text-sm">
                          {profile?.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="gap-2"
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Profile
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* User-level notification preferences */}
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">My Notifications</CardTitle>
              <CardDescription>
                Control which notifications you personally receive. These
                settings only affect your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-muted/50 p-2.5">
                        <BellRing className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-foreground">
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
                  <div className="flex items-center justify-between py-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-muted/50 p-2.5">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-foreground">
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
            </CardContent>
          </Card>
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
