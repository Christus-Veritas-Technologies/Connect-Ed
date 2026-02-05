# Connect-Ed Design System

## Data Presentation Patterns

This document outlines the standardized patterns for presenting data across the Connect-Ed platform.

---

## 1. Cards

**Use For:** Short, numerical data with optional trend indicators

**Purpose:** Quick overview of key metrics, statistics, and KPIs

**Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Metric Name</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">{value}</div>
    {/* Optional trend indicator */}
    <p className="text-sm text-green-600 flex items-center gap-1">
      <UpIcon />
      26% from last month
    </p>
  </CardContent>
</Card>
```

**Examples:**
- "20 Classes" 
- "1,300 Students"
- "₹45,000 Revenue" with "↑ 26% from last month" (green text)
- "5 Pending Fees" with "↓ 12% from last week" (green text)

**Guidelines:**
- Use large, bold typography for the primary value
- Trend indicators should always be in green text with appropriate icon (up/down)
- Keep card titles concise (1-3 words)
- Optionally include a subtle icon representing the metric

---

## 2. Tables (Shadcn)

**Use For:** Structured data with multiple columns and rows

**Purpose:** Displaying lists of entities (students, teachers, fees, expenses) with sortable/filterable capabilities

**Structure:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.field1}</TableCell>
        <TableCell>{item.field2}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Required Features:**
- **10-item pagination** (mandatory)
- Sortable columns where applicable
- Clear column headers
- Row actions (view, edit, delete) in the last column
- Responsive design (stack or scroll on mobile)

**Examples:**
- Student list with name, class, parent, fees status
- Teacher list with name, subjects, classes
- Fee records with student, amount, status, due date
- Expense records with description, amount, category, date

**Guidelines:**
- Always implement pagination with 10 items per page
- Use consistent action buttons (View, Edit, Delete)
- Show loading skeletons while data fetches
- Empty states should provide guidance

---

## 3. Charts

**Use For:** Data visualization showing correlations, trends, or distributions over time

**Purpose:** Visual representation of complex data patterns

**Types:**

### 3.1 Donut/Pie Charts
- **Use For:** Showing proportions and percentages
- **Examples:** Fee status distribution, student enrollment by class, expense categories

### 3.2 Line Charts
- **Use For:** Trends over time
- **Examples:** Monthly revenue, attendance trends, enrollment growth

### 3.3 Bar/Column Charts
- **Use For:** Comparing values across categories
- **Examples:** Revenue by class, expenses by month, teacher workload

**Guidelines:**
- Always include axis labels and legends
- Use consistent color schemes (brand colors preferred)
- Keep charts simple and focused on one insight
- Provide tooltips on hover for detailed values
- Include a title describing what the chart shows

---

## 4. Lists

**Use For:** Simple, sequential data without complex structure

**Purpose:** Displaying ordered or unordered items without the complexity of tables

**Structure:**
```tsx
<ul className="space-y-2">
  {items.map(item => (
    <li key={item.id} className="flex items-center gap-2 p-2">
      <Icon />
      <span>{item.name}</span>
    </li>
  ))}
</ul>
```

**Examples:**
- Recent notifications
- Quick activity feed
- Upcoming events/deadlines
- Student attendance today
- Pending approvals

**Guidelines:**
- Use when structure doesn't require multiple columns
- Include relevant icons for visual clarity
- Keep list items concise (1-2 lines max)
- Add timestamps for time-sensitive data
- Use alternating backgrounds or dividers for clarity

---

## 5. Buttons

**Use For:** User actions and interactions

**Purpose:** Triggering operations, navigating, and submitting forms

**Variants:**

### 5.1 Default (Primary)
- **Use For:** Primary actions on a page
- **Examples:** "Add Student", "Save Changes", "Generate Report"
- **Color:** Brand color background with white text

### 5.2 Secondary
- **Use For:** Secondary actions or alternative options
- **Examples:** "Export Data", "View Details", "Filter"
- **Color:** Muted background with dark text

### 5.3 Outline
- **Use For:** Tertiary actions, cancel, or non-critical operations
- **Examples:** "Cancel", "Go Back", "Reset Filters"
- **Color:** Transparent with border

### 5.4 Destructive
- **Use For:** Dangerous actions requiring confirmation
- **Examples:** "Delete Student", "Remove Teacher", "Cancel Subscription"
- **Color:** Red/destructive color

**Guidelines:**
- Limit primary buttons to 1-2 per view
- Use consistent action verbs (Add, Edit, Delete, View, Export)
- Always provide visual feedback on click (loading state)
- Group related actions together
- Position primary action on the right in action groups

---

## Implementation Checklist

When building a new dashboard page, ensure:

- [ ] Stat cards for key metrics with trend indicators
- [ ] Tables have 10-item pagination
- [ ] Charts are used for time-based or correlation data
- [ ] Lists for simple sequential data
- [ ] Button hierarchy follows variant guidelines
- [ ] Responsive design works on mobile
- [ ] Loading states for all async data
- [ ] Empty states with helpful messages
- [ ] Consistent spacing and layout

---

## Color System

### Data Trends
- **Positive (Increase):** `text-green-600` with up arrow icon
- **Negative (Decrease):** `text-green-600` with down arrow icon
- **Neutral:** `text-gray-600`

> Note: Even decreases can be positive (e.g., "Pending fees down by 20%"), hence green for both directions

### Chart Colors
Use brand color palette:
- Primary: `#3B82F6` (brand)
- Secondary: `#10B981` (success)
- Tertiary: `#F59E0B` (warning)
- Quaternary: `#EF4444` (destructive)
- Accents: `#8B5CF6`, `#EC4899`

---

## Accessibility

- All interactive elements must have sufficient color contrast
- Charts must include text alternatives for screen readers
- Tables must use semantic HTML with proper headers
- Button labels must be descriptive
- Focus states must be visible

---

## Responsive Behavior

### Mobile (<768px)
- Stack cards vertically
- Tables scroll horizontally or transform to cards
- Charts scale to container width
- Reduce padding and font sizes
- Collapsible sections for complex data

### Tablet (768px-1024px)
- 2-column card layout
- Full table display with horizontal scroll if needed
- Full chart display

### Desktop (>1024px)
- 3-4 column card layout
- Full table display
- Side-by-side charts where appropriate
