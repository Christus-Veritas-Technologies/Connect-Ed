"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Invoice03Icon,
  Add01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useExpenses, useCreateExpense } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formData, setFormData] = useState<{
    amount: string;
    category: string;
    description: string;
    date: string;
  }>({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0] as string,
  });

  // Query hooks
  const { data, isLoading } = useExpenses({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });
  const createMutation = useCreateExpense();

  const expenses = data?.expenses || [];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
      },
      {
        onSuccess: () => {
          setFormData({
            amount: "",
            category: "",
            description: "",
            date: new Date().toISOString().split("T")[0] as string,
          });
          setShowAddModal(false);
        },
      }
    );
  };

  const formError = createMutation.error instanceof ApiError 
    ? createMutation.error.message 
    : createMutation.error?.message;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HugeiconsIcon icon={Invoice03Icon} size={28} className="text-brand" />
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage school expenses
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Expense
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-3xl font-bold">${totalExpenses.toLocaleString()}</p>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <HugeiconsIcon icon={Invoice03Icon} size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No expenses recorded</p>
              <Button onClick={() => setShowAddModal(true)}>
                <HugeiconsIcon icon={Add01Icon} size={20} />
                Record Your First Expense
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {expenses.map((expense, index) => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <TableCell>
                        {new Date(expense.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${expense.amount.toLocaleString()}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={createMutation.isPending}>
                {!createMutation.isPending && (
                  <>
                    <HugeiconsIcon icon={Add01Icon} size={18} />
                    Add Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
