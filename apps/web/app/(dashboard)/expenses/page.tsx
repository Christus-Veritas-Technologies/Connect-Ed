"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "../../lib/auth-context";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  recordedBy: { id: string; name: string };
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  "Supplies",
  "Utilities",
  "Maintenance",
  "Salaries",
  "Equipment",
  "Transportation",
  "Food",
  "Events",
  "Other",
];

export default function ExpensesPage() {
  const authFetch = useAuthFetch();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      
      const response = await authFetch(`/api/expenses?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.data.expenses);
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await authFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to add expense");
      }

      setFormData({
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowAddModal(false);
      fetchExpenses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Expenses</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Track and manage school expenses
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Total Expenses</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>${totalExpenses.toLocaleString()}</p>
          </div>
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
            <div className="spinner"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center" style={{ padding: '3rem', color: 'var(--muted-foreground)' }}>
            <p>No expenses recorded</p>
            <button 
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => setShowAddModal(true)}
            >
              Record Your First Expense
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-primary">{expense.category}</span>
                  </td>
                  <td>{expense.description}</td>
                  <td style={{ fontWeight: 600 }}>${expense.amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    {expense.recordedBy.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Expense Modal */}
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
              Add Expense
            </h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleAddExpense}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Select category...</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Brief description of the expense"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
