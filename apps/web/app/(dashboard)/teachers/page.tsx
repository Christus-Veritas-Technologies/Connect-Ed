"use client";

import { useEffect, useState } from "react";
import { useAuth, useAuthFetch } from "../../lib/auth-context";

interface Teacher {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  classes?: Array<{ id: string; name: string }>;
  createdAt: string;
}

export default function TeachersPage() {
  const { school } = useAuth();
  const authFetch = useAuthFetch();
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch("/api/teachers");
      const data = await response.json();
      
      if (data.success) {
        setTeachers(data.data.teachers);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await authFetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role: "TEACHER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to add teacher");
      }

      setFormData({ name: "", email: "", password: "" });
      setShowAddModal(false);
      fetchTeachers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if plan supports teachers
  if (school?.plan === "LITE") {
    return (
      <div className="text-center" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          Teacher Management
        </h1>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
          Teacher management is available in Growth and Enterprise plans.
        </p>
        <a href="/dashboard/settings" className="btn btn-primary">
          Upgrade Plan
        </a>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Teachers</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Manage teacher accounts and assignments
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Teacher
        </button>
      </div>

      {/* Teachers Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--muted-foreground)' }}>
            <p>No teachers added yet</p>
            <button 
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Teacher
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Classes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td><strong>{teacher.name}</strong></td>
                  <td>{teacher.email}</td>
                  <td>
                    {teacher.classes?.length 
                      ? teacher.classes.map(c => c.name).join(", ")
                      : "-"
                    }
                  </td>
                  <td>
                    <span className={`badge ${teacher.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {teacher.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Add New Teacher
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleAddTeacher}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="teacher@school.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Initial Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Temporary password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                  Teacher should change this on first login
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
