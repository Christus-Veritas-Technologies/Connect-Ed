"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Class {
  id: string;
  name: string;
  isActive: boolean;
  classTeacher?: { id: string; name: string } | null;
  _count?: { students: number };
  createdAt: string;
}

export default function ClassesPage() {
  const { school } = useAuth();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);

  const [formData, setFormData] = useState({
    name: "",
    classTeacherId: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ classes: Class[] }>("/classes");
      setClasses(data.classes);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await api.get<{ teachers: Array<{ id: string; name: string }> }>("/teachers");
      setTeachers(data.teachers);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      await api.post("/classes", formData);
      setFormData({ name: "", classTeacherId: "" });
      setShowAddModal(false);
      fetchClasses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if plan supports classes
  if (school?.plan === "LITE") {
    return (
      <div className="text-center" style={{ padding: '3rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          Class Management
        </h1>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
          Class management is available in Growth and Enterprise plans.
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Classes</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Manage school classes and assign teachers
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Class
        </button>
      </div>

      {/* Classes Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1rem'
      }}>
        {isLoading ? (
          <div className="card flex items-center justify-center" style={{ padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              No classes created yet
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Create Your First Class
            </button>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{cls.name}</h3>
                <span className={`badge ${cls.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {cls.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                <p>
                  <strong>Teacher:</strong> {cls.classTeacher?.name || 'Not assigned'}
                </p>
                <p>
                  <strong>Students:</strong> {cls._count?.students || 0}
                </p>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                  View
                </button>
                <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Class Modal */}
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
              Create New Class
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleAddClass}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Class Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Grade 5A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Class Teacher (optional)</label>
                <select
                  className="form-input"
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                >
                  <option value="">Select teacher...</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
