import { Card, CardHeader } from "@/components/ui/Card";
import type { ActivityItem, AlertItem } from "@/types/dashboard";
import { AlertTriangle, Info, Package } from "lucide-react";

export function DashboardAlerts({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardHeader title="Alertas" description="Atención requerida" />
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="flex items-start gap-3 rounded-lg bg-background px-3 py-2.5 text-sm"
          >
            {alert.type === "stock" ? (
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : alert.severity === "info" ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            )}
            <span>{alert.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader title="Actividad reciente" />
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
            <p className="text-sm text-foreground">{item.message}</p>
            <p className="mt-1 text-xs text-muted">
              {new Date(item.timestamp).toLocaleString("es-PE", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
