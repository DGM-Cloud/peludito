import { appointmentsService } from "@/services/appointments.service";
import { clientsService } from "@/services/clients.service";
import { patientsService } from "@/services/patients.service";

export type SearchResultGroup = {
  patients: ReturnType<typeof patientsService.search>;
  clients: ReturnType<typeof clientsService.search>;
  appointments: ReturnType<typeof appointmentsService.getAppointments>;
};

export const searchService = {
  search(query: string): SearchResultGroup {
    const q = query.trim();
    if (q.length < 2) {
      return { patients: [], clients: [], appointments: [] };
    }
    const patients = patientsService.search(q).slice(0, 5);
    const clients = clientsService.search(q).slice(0, 5);
    const lower = q.toLowerCase();
    const appointments = appointmentsService
      .getAppointments()
      .filter((a) => {
        const patient = patientsService.getPatientById(a.patientId);
        const client = clientsService.getClientById(a.clientId);
        return (
          patient?.name.toLowerCase().includes(lower) ||
          client?.name.toLowerCase().includes(lower) ||
          a.reason.toLowerCase().includes(lower)
        );
      })
      .slice(0, 5);

    return { patients, clients, appointments };
  },
};
