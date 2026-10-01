"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyConsultations } from "@/types/dashboard";

export function ConsultationsChart({ data }: { data: DailyConsultations[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#5c726a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#5c726a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#ccfbf1", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8e5",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Consultas" fill="#0d9488" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
