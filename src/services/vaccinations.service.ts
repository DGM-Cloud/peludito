import { vaccinations as seed, medications } from "@/data/mock/vaccinations";
import { followUpsService } from "@/services/follow-ups.service";
import { patientsService } from "@/services/patients.service";
import type { CreateVaccinationInput, Vaccination } from "@/types/vaccination";
import { DEMO_TODAY } from "@/config/demo";

let store: Vaccination[] = [...seed];

function computeStatus(nextDue: string): Vaccination["status"] {
  const today = new Date(DEMO_TODAY);
  const due = new Date(nextDue);
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencida";
  if (diff <= 7) return "proxima";
  return "vigente";
}

export const vaccinationsService = {
  getVaccinations(): Vaccination[] {
    return store.map((v) => ({ ...v, status: computeStatus(v.nextDue) }));
  },

  getByPatientId(patientId: string): Vaccination[] {
    return this.getVaccinations().filter((v) => v.patientId === patientId);
  },

  getPending(): Vaccination[] {
    return this.getVaccinations().filter(
      (v) => v.status === "proxima" || v.status === "vencida",
    );
  },

  createVaccination(data: CreateVaccinationInput): Vaccination {
    const vaccination: Vaccination = {
      ...data,
      id: `vac-${Date.now()}`,
      status: computeStatus(data.nextDue),
    };
    store = [vaccination, ...store];

    const patient = patientsService.getPatientById(data.patientId);
    if (patient) {
      followUpsService.createFollowUp({
        patientId: patient.id,
        clientId: patient.clientId,
        type: "vacuna",
        title: `Próxima dosis: ${data.name} — ${patient.name}`,
        dueDate: data.nextDue,
        relatedId: vaccination.id,
        status: "pendiente",
      });
    }

    return vaccination;
  },

  getMedicationsByPatientId(patientId: string) {
    return medications.filter((m) => m.patientId === patientId);
  },
};
