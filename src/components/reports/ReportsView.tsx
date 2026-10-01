"use client";

import { ReportCharts } from "@/components/reports/ReportCharts";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { DEMO_TODAY } from "@/config/demo";
import { useDemo } from "@/context/DemoProvider";
import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";
import { reportsService } from "@/services/reports.service";
import { salesService } from "@/services/sales.service";
import { veterinariansService } from "@/services/veterinarians.service";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  PawPrint,
  ShoppingBag,
  Stethoscope,
  UserX,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

export function ReportsView() {
  const { version } = useDemo();

  const data = useMemo(() => {
    const kpis = reportsService.getOperationalKpis(DEMO_TODAY);
    const cash = salesService.getCashSummary(DEMO_TODAY);
    const noShow = reportsService.getNoShowStats();
    const consultations = reportsService.getConsultationsLast7Days();
    const monthlySales = reportsService.getMonthlySales();
    const services = reportsService.getTopServices();
    const products = reportsService.getTopProducts();
    const vets = veterinariansService.getVeterinarians().map((v) => ({
      name: v.name,
      count: appointmentsService
        .getAppointments()
        .filter(
          (a) =>
            a.veterinarianId === v.id &&
            ["atendida", "pagada"].includes(a.status),
        ).length,
    }));

    return {
      kpis,
      cash,
      noShow,
      consultations,
      monthlySales,
      services,
      products,
      vets,
      patients: patientsService.getPatients().length,
      clients: clientsService.getClients().length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="¿Cuánto vendimos hoy?"
          value={formatCurrency(data.cash.total)}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          label="Consultas (7 días)"
          value={data.consultations.reduce((a, d) => a + d.count, 0)}
          icon={<Stethoscope className="h-5 w-5" />}
        />
        <StatCard
          label="Pagos pendientes hoy"
          value={data.kpis.pendingPayments}
          icon={<Wallet className="h-5 w-5" />}
          hint={`${data.kpis.waiting} en espera`}
        />
        <StatCard
          label="Pacientes activos"
          value={data.patients}
          icon={<PawPrint className="h-5 w-5" />}
          hint={`${data.clients} clientes`}
        />
        <StatCard
          label="No asistieron"
          value={data.noShow.noShows}
          icon={<UserX className="h-5 w-5" />}
          hint={`${data.noShow.canceladas} canceladas`}
        />
      </div>

      <ReportCharts
        consultations={data.consultations}
        sales={data.monthlySales}
        services={data.services}
        products={data.products}
      />

      <Card className="mt-6">
        <CardHeader
          title="¿Qué veterinario tiene más atenciones?"
          description="Consultas atendidas o cobradas en el periodo demo"
        />
        <ul className="space-y-2">
          {data.vets.map((v) => (
            <li
              key={v.name}
              className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
            >
              <span>{v.name}</span>
              <span className="font-semibold">{v.count}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
