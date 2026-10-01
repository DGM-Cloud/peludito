"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type {
  DailyConsultations,
  MonthlySales,
  ServiceUsage,
  TopProduct,
} from "@/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export function WeeklyConsultationsChart({
  data,
}: {
  data: DailyConsultations[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5c726a" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#5c726a" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8e5", fontSize: 12 }} />
          <Bar dataKey="count" name="Consultas" fill="#0d9488" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlySalesChart({ data }: { data: MonthlySales[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e5" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5c726a" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#5c726a" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? `S/ ${value.toLocaleString("es-PE")}`
                : value
            }
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8e5", fontSize: 12 }}
          />
          <Bar dataKey="total" name="Ventas" fill="#0f766e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServicesChart({ data }: { data: ServiceUsage[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8e5", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#5c726a" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: "#5c726a" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8e5", fontSize: 12 }} />
          <Bar dataKey="quantity" name="Vendidos" fill="#14b8a6" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportCharts({
  consultations,
  sales,
  services,
  products,
}: {
  consultations: DailyConsultations[];
  sales: MonthlySales[];
  services: ServiceUsage[];
  products: TopProduct[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Consultas por semana" />
        <WeeklyConsultationsChart data={consultations} />
      </Card>
      <Card>
        <CardHeader title="Ventas por mes" />
        <MonthlySalesChart data={sales} />
      </Card>
      <Card>
        <CardHeader title="Servicios más utilizados" />
        <ServicesChart data={services} />
      </Card>
      <Card>
        <CardHeader title="Productos más vendidos" />
        <TopProductsChart data={products} />
      </Card>
    </div>
  );
}
