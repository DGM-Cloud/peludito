import { recentActivity } from "@/data/mock/activity";
import { DEMO_TODAY } from "@/config/demo";
import { appointmentsService } from "@/services/appointments.service";
import { followUpsService } from "@/services/follow-ups.service";
import { hospitalizationsService } from "@/services/hospitalizations.service";
import { inventoryService } from "@/services/inventory.service";
import { salesService } from "@/services/sales.service";
import { vaccinationsService } from "@/services/vaccinations.service";
import type { AlertItem, DailyConsultations, MonthlySales, ServiceUsage, TopProduct } from "@/types/dashboard";

export const reportsService = {
  getOperationalKpis(date = DEMO_TODAY) {
    const aptStats = appointmentsService.getTodayStats(date);
    const cash = salesService.getCashSummary(date);
    const pendingPayments = appointmentsService
      .getAppointmentsByDate(date)
      .filter((a) => a.status === "atendida").length;

    return {
      appointmentsToday: aptStats.total,
      waiting: aptStats.esperando,
      attended: aptStats.atendidas,
      incomeToday: cash.total,
      pendingPayments,
      hospitalized: hospitalizationsService.getActive().length,
    };
  },

  getAlerts(): AlertItem[] {
    const pendingVaccines = vaccinationsService.getPending().length;
    const lowStock = inventoryService.getLowStock().length;
    const unconfirmed = appointmentsService.getTodayStats(DEMO_TODAY).noConfirmadas;
    const pendingPay = appointmentsService
      .getAppointmentsByDate(DEMO_TODAY)
      .filter((a) => a.status === "atendida").length;
    const hosp = hospitalizationsService.getActive().length;
    const expiring = inventoryService.getExpiringBatches(15).length;
    const followUps = followUpsService.getPending().length;

    const alerts: AlertItem[] = [];
    if (pendingVaccines > 0) {
      alerts.push({
        id: "alert-vac",
        type: "vaccine",
        message: `${pendingVaccines} vacunas requieren seguimiento`,
        severity: "warning",
        href: "/vaccines",
        actionLabel: "Ver vacunas",
      });
    }
    if (lowStock > 0) {
      alerts.push({
        id: "alert-stock",
        type: "stock",
        message: `${lowStock} productos con stock bajo o crítico`,
        severity: "warning",
        href: "/inventory?filter=bajo",
        actionLabel: "Ver inventario",
      });
    }
    if (unconfirmed > 0) {
      alerts.push({
        id: "alert-apt",
        type: "appointment",
        message: `${unconfirmed} citas aún no fueron confirmadas`,
        severity: "info",
        href: "/appointments",
        actionLabel: "Revisar agenda",
      });
    }
    if (pendingPay > 0) {
      alerts.push({
        id: "alert-pay",
        type: "payment",
        message: `${pendingPay} pago${pendingPay > 1 ? "s" : ""} pendiente${pendingPay > 1 ? "s" : ""}`,
        severity: "warning",
        href: "/pos",
        actionLabel: "Ir a caja",
      });
    }
    if (hosp > 0) {
      alerts.push({
        id: "alert-hosp",
        type: "hospitalization",
        message: `${hosp} paciente${hosp > 1 ? "s" : ""} hospitalizado${hosp > 1 ? "s" : ""}`,
        severity: "info",
        href: "/hospitalization",
        actionLabel: "Ver hospitalización",
      });
    }
    if (expiring > 0) {
      alerts.push({
        id: "alert-exp",
        type: "expiry",
        message: `${expiring} lote${expiring > 1 ? "s" : ""} vence${expiring > 1 ? "n" : ""} pronto`,
        severity: "critical",
        href: "/inventory",
        actionLabel: "Ver vencimientos",
      });
    }
    if (followUps > 0) {
      alerts.push({
        id: "alert-fu",
        type: "appointment",
        message: `${followUps} seguimientos pendientes`,
        severity: "info",
        href: "/follow-ups",
        actionLabel: "Ver seguimientos",
      });
    }
    return alerts;
  },

  getRecentActivity() {
    return [...recentActivity];
  },

  getConsultationsLast7Days(): DailyConsultations[] {
    // 2026-09-16 = miércoles … 2026-09-22 = martes
    return [
      { date: "2026-09-16", label: "Mié", count: 6 },
      { date: "2026-09-17", label: "Jue", count: 9 },
      { date: "2026-09-18", label: "Vie", count: 11 },
      { date: "2026-09-19", label: "Sáb", count: 8 },
      { date: "2026-09-20", label: "Dom", count: 5 },
      { date: "2026-09-21", label: "Lun", count: 3 },
      {
        date: DEMO_TODAY,
        label: "Mar",
        count: Math.max(
          appointmentsService.getTodayStats(DEMO_TODAY).atendidas,
          1,
        ),
      },
    ];
  },

  getMonthlySales(): MonthlySales[] {
    return [
      { month: "Abr", total: 12400 },
      { month: "May", total: 13850 },
      { month: "Jun", total: 15200 },
      { month: "Jul", total: 14100 },
      { month: "Ago", total: 16800 },
      { month: "Sep", total: 15420 },
    ];
  },

  getTopServices(): ServiceUsage[] {
    return [
      { name: "Consulta general", count: 48 },
      { name: "Vacunación", count: 36 },
      { name: "Control", count: 29 },
      { name: "Grooming", count: 22 },
      { name: "Dermatología", count: 18 },
    ];
  },

  getTopProducts(): TopProduct[] {
    return [
      { name: "Alimento premium adulto", quantity: 42 },
      { name: "Antiparasitario interno", quantity: 38 },
      { name: "Champú hipoalergénico", quantity: 31 },
      { name: "Collar antipulgas", quantity: 27 },
      { name: "Amoxicilina 500mg", quantity: 24 },
    ];
  },

  getNoShowStats() {
    const all = appointmentsService.getAppointments();
    return {
      total: all.length,
      noShows: all.filter((a) => a.status === "no_asistio").length,
      canceladas: all.filter((a) => a.status === "cancelada").length,
    };
  },

  getVaccinesByPatientId(patientId: string) {
    return vaccinationsService.getByPatientId(patientId);
  },

  getMedicationsByPatientId(patientId: string) {
    return vaccinationsService.getMedicationsByPatientId(patientId);
  },
};
