"use client";

import { useState } from "react";
import { useAuth, useAuthFetch } from "../../lib/auth-context";
import { PRICING } from "../../lib/pricing";

export default function SettingsPage() {
  const { school, user, refreshToken } = useAuth();
  const authFetch = useAuthFetch();
  
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [schoolForm, setSchoolForm] = useState({
    name: school?.name || "",
  });

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await authFetch("/api/settings/school", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      await refreshToken();
      setMessage({ type: "success", text: "Settings updated successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const planPricing = school?.plan ? PRICING[school.plan] : null;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Manage your school settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {[
          { id: "general", label: "General" },
          { id: "billing", label: "Billing" },
          { id: "users", label: "Users" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem' }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            School Information
          </h2>
          <form onSubmit={handleUpdateSchool}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">School Name</label>
              <input
                type="text"
                className="form-input"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">School ID</label>
              <input
                type="text"
                className="form-input"
                value={school?.id || ""}
                disabled
                style={{ background: 'var(--muted)' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                Use this ID when making cash payments
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Billing Settings */}
      {activeTab === "billing" && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Current Plan
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className={`badge ${
                  school?.plan === 'ENTERPRISE' ? 'badge-primary' : 
                  school?.plan === 'GROWTH' ? 'badge-success' : 
                  'badge-warning'
                }`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  {school?.plan} Plan
                </span>
                <p style={{ marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                  {planPricing?.description}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  ${planPricing?.monthlyEstimate}/mo
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  (${planPricing?.perTermCost}/term)
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Plan Features
            </h2>
            <ul style={{ listStyle: 'none' }}>
              {planPricing?.features.map((feature, i) => (
                <li key={i} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--primary)' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {school?.plan !== "ENTERPRISE" && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                <p style={{ fontWeight: 600 }}>Need more features?</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                  Upgrade your plan to unlock additional features and higher quotas.
                </p>
                <a href="/payment" className="btn btn-primary">
                  Upgrade Plan
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Settings */}
      {activeTab === "users" && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Team Members
            </h2>
            <button className="btn btn-primary">
              + Add User
            </button>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <p style={{ fontWeight: 600 }}>{user?.name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{user?.email}</p>
              </div>
              <span className="badge badge-primary">{user?.role}</span>
            </div>
            <div style={{ padding: '1rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              Additional team members will appear here. Click &quot;Add User&quot; to invite receptionists or teachers.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
