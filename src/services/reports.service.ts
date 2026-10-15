import { readSnapshot } from "@/lib/clinic-cache";

export const reportsService = {
  getOperationalKpis(_date?: string) {
    return readSnapshot().reports.kpis;
  },

  getAlerts() {
    return readSnapshot().reports.alerts;
  },

  getRecentActivity() {
    return readSnapshot().reports.activity;
  },

  getConsultationsLast7Days() {
    return readSnapshot().reports.consultations;
  },

  getMonthlySales() {
    return readSnapshot().reports.monthlySales;
  },

  getTopServices() {
    return readSnapshot().reports.topServices;
  },

  getTopProducts() {
    return readSnapshot().reports.topProducts;
  },

  getNoShowStats() {
    return readSnapshot().reports.noShow;
  },

  getVaccinesByPatientId(patientId: string) {
    return readSnapshot().vaccinations.filter((item) => item.patientId === patientId);
  },

  getMedicationsByPatientId(patientId: string) {
    return readSnapshot().medications.filter((item) => item.patientId === patientId);
  },
};
