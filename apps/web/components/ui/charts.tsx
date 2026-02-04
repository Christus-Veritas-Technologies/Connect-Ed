"use client";

import { useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportChartAsPDF, exportToCSV } from "@/lib/export-utils";

// Color palette
const COLORS = {
  primary: "#4F46E5",
  secondary: "#7C3AED",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  muted: "#6B7280",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.secondary,
  COLORS.info,
];

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  exportFileName?: string;
  exportData?: Record<string, unknown>[];
  exportHeaders?: { key: string; label: string }[];
}

export function ChartCard({
  title,
  description,
  children,
  exportFileName = "chart",
  exportData,
  exportHeaders,
}: ChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (chartRef.current) {
      await exportChartAsPDF(chartRef.current, exportFileName, title);
    }
  };

  const handleExportCSV = () => {
    if (exportData && exportHeaders) {
      exportToCSV(exportData, exportHeaders as { key: keyof typeof exportData[0]; label: string }[], exportFileName);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <HugeiconsIcon icon={Download01Icon} className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPDF}>
              Export as PDF
            </DropdownMenuItem>
            {exportData && exportHeaders && (
              <DropdownMenuItem onClick={handleExportCSV}>
                Export as CSV
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>{children}</div>
      </CardContent>
    </Card>
  );
}

// Bar Chart Component
interface BarChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface CustomBarChartProps {
  data: BarChartData[];
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  bars?: { dataKey: string; color: string; name?: string }[];
}

export function CustomBarChart({
  data,
  dataKey = "value",
  xAxisKey = "name",
  color = COLORS.primary,
  height = 300,
  showGrid = true,
  showLegend = false,
  formatYAxis,
  formatTooltip,
  bars,
}: CustomBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          formatter={(value) => [formatTooltip ? formatTooltip(value as number) : value]}
        />
        {showLegend && <Legend />}
        {bars ? (
          bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.color}
              name={bar.name || bar.dataKey}
              radius={[4, 4, 0, 0]}
            />
          ))
        ) : (
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Line Chart Component
interface LineChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface CustomLineChartProps {
  data: LineChartData[];
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showDots?: boolean;
  formatYAxis?: (value: number) => string;
  lines?: { dataKey: string; color: string; name?: string }[];
}

export function CustomLineChart({
  data,
  dataKey = "value",
  xAxisKey = "name",
  color = COLORS.primary,
  height = 300,
  showGrid = true,
  showDots = true,
  formatYAxis,
  lines,
}: CustomLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend />
        {lines ? (
          lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              name={line.name || line.dataKey}
              strokeWidth={2}
              dot={showDots ? { fill: line.color, strokeWidth: 2 } : false}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={showDots ? { fill: color, strokeWidth: 2 } : false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Area Chart Component
interface AreaChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface CustomAreaChartProps {
  data: AreaChartData[];
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  formatYAxis?: (value: number) => string;
  areas?: { dataKey: string; color: string; name?: string }[];
}

export function CustomAreaChart({
  data,
  dataKey = "value",
  xAxisKey = "name",
  color = COLORS.primary,
  height = 300,
  showGrid = true,
  formatYAxis,
  areas,
}: CustomAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend />
        {areas ? (
          areas.map((area) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              stroke={area.color}
              fill={area.color}
              fillOpacity={0.2}
              name={area.name || area.dataKey}
            />
          ))
        ) : (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Pie Chart Component
interface PieChartData {
  name: string;
  value: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: number;
  colors?: string[];
}

export function CustomPieChart({
  data,
  height = 300,
  showLegend = true,
  showLabels = false,
  innerRadius = 0,
  colors = PIE_COLORS,
}: CustomPieChartProps) {
  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomizedLabel : undefined}
          outerRadius={height / 3}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "primary" | "success" | "warning" | "danger";
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  color = "primary",
}: StatCardProps) {
  const colorClasses = {
    primary: "from-brand to-mid",
    success: "from-success to-emerald-600",
    warning: "from-warning to-orange-600",
    danger: "from-destructive to-red-600",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
                <span className="text-muted-foreground">from last month</span>
              </p>
            )}
          </div>
          {icon && (
            <div
              className={`size-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white`}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { COLORS, PIE_COLORS };
