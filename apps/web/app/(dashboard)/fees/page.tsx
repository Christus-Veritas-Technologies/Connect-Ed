"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthFetch } from "../../lib/auth-context";

interface Fee {
  id: string;
  amount: number;
  paidAmount: number;
  description: string;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  createdAt: string;
}

export default function FeesPage() {
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Fee | null>(null);

  // Form states
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    amount: "",
    description: "",
    dueDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    reference: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFees = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter.toUpperCase());
      
      const response = await authFetch(`/api/fees?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setFees(data.data.fees);
      }
    } catch (error) {
      console.error("Failed to fetch fees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await authFetch("/api/students?limit=1000");
      const data = await response.json();
      if (data.success) {
        setStudents(data.data.students);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchStudents();
  }, [filter]);

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await authFetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feeForm,
          amount: parseFloat(feeForm.amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to add fee");
      }

      setFeeForm({ studentId: "", amount: "", description: "", dueDate: "" });
      setShowAddModal(false);
      fetchFees();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await authFetch(`/api/fees/${showPaymentModal.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to record payment");
      }

      setPaymentForm({ amount: "", paymentMethod: "CASH", reference: "", notes: "" });
      setShowPaymentModal(null);
      fetchFees();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Fee["status"]) => {
    switch (status) {
      case "PAID": return "badge-success";
      case "PARTIAL": return "badge-warning";
      case "OVERDUE": return "badge-danger";
      default: return "badge-primary";
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Fees</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Track student fees and payments
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Create Fee
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {["all", "pending", "partial", "paid", "overdue"].map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textTransform: 'capitalize' }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Fees Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : fees.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--muted-foreground)' }}>
            <p>No fees found</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id}>
                  <td>
                    <strong>{fee.student.firstName} {fee.student.lastName}</strong>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      {fee.student.admissionNumber}
                    </span>
                  </td>
                  <td>{fee.description}</td>
                  <td>${fee.amount.toLocaleString()}</td>
                  <td style={{ color: fee.paidAmount > 0 ? 'green' : 'inherit' }}>
                    ${fee.paidAmount.toLocaleString()}
                  </td>
                  <td>{new Date(fee.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(fee.status)}`}>
                      {fee.status}
                    </span>
                  </td>
                  <td>
                    {fee.status !== "PAID" && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                        onClick={() => {
                          setShowPaymentModal(fee);
                          setPaymentForm({
                            amount: String(fee.amount - fee.paidAmount),
                            paymentMethod: "CASH",
                            reference: "",
                            notes: "",
                          });
                        }}
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Fee Modal */}
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
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Create New Fee
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleAddFee}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Student</label>
                <select
                  className="form-input"
                  value={feeForm.studentId}
                  onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })}
                  required
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Term 1 Tuition"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="0.01"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={feeForm.dueDate}
                    onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Record Payment
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              {showPaymentModal.student.firstName} {showPaymentModal.student.lastName} - {showPaymentModal.description}
            </p>
            <p style={{ marginBottom: '1rem' }}>
              Outstanding: <strong>${(showPaymentModal.amount - showPaymentModal.paidAmount).toLocaleString()}</strong>
            </p>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max={showPaymentModal.amount - showPaymentModal.paidAmount}
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Reference (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Receipt number or reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPaymentModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
