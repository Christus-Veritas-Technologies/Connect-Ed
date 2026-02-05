"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface FinancialReport {
  totalFeesExpected: number;
  totalFeesCollected: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  byMonth: Array<{
    month: string;
    collected: number;
    expenses: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
  }>;
}

export default function ReportsPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<FinancialReport>(`/reports/financial?period=${period}`);
        setReport(data);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Financial Reports</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Overview of your school&apos;s financial health
          </p>
        </div>
        <select
          className="form-input"
          style={{ width: 'auto' }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="monthly">This Month</option>
          <option value="quarterly">This Quarter</option>
          <option value="yearly">This Year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card">
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Expected Fees</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            ${report?.totalFeesExpected?.toLocaleString() || 0}
          </p>
        </div>
        <div className="card">
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Collected</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'green' }}>
            ${report?.totalFeesCollected?.toLocaleString() || 0}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            {report?.collectionRate || 0}% collection rate
          </p>
        </div>
        <div className="card">
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Expenses</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--destructive)' }}>
            ${report?.totalExpenses?.toLocaleString() || 0}
          </p>
        </div>
        <div className="card">
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Net Income</p>
          <p style={{ 
            fontSize: '1.75rem', 
            fontWeight: 700,
            color: (report?.netIncome || 0) >= 0 ? 'green' : 'var(--destructive)'
          }}>
            ${report?.netIncome?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Monthly Breakdown */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Monthly Breakdown
          </h2>
          {report?.byMonth && report.byMonth.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {report.byMonth.map((month) => (
                <div key={month.month}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{month.month}</span>
                    <span>
                      <span style={{ color: 'green' }}>${month.collected.toLocaleString()}</span>
                      {" / "}
                      <span style={{ color: 'var(--destructive)' }}>${month.expenses.toLocaleString()}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', height: '8px', gap: '2px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        background: 'green',
                        width: `${(month.collected / (month.collected + month.expenses)) * 100}%`
                      }}
                    ></div>
                    <div 
                      style={{ 
                        background: 'var(--destructive)',
                        width: `${(month.expenses / (month.collected + month.expenses)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)' }}>No data available for this period</p>
          )}
        </div>

        {/* Top Expense Categories */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Top Expense Categories
          </h2>
          {report?.topExpenseCategories && report.topExpenseCategories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {report.topExpenseCategories.map((cat, i) => {
                const maxAmount = report.topExpenseCategories[0]?.amount || 1;
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>{cat.category}</span>
                      <span style={{ fontWeight: 600 }}>${cat.amount.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%',
                          background: 'var(--primary)',
                          width: `${(cat.amount / maxAmount) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--muted-foreground)' }}>No expenses recorded</p>
          )}
        </div>
      </div>

      {/* Outstanding Fees */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/dashboard/fees?filter=overdue" className="btn btn-outline">
            View Overdue Fees
          </a>
          <button className="btn btn-outline" onClick={() => window.print()}>
            Print Report
          </button>
          <button className="btn btn-outline">
            Export to CSV
          </button>
        </div>
      </div>
    </div>
  );
}
