"use client";

import { useCallback, useState } from "react";
import { patientsService } from "@/services/patients.service";
import type { CreatePatientInput, Patient } from "@/types/patient";

export function usePatients(initial?: Patient[]) {
  const [patients, setPatients] = useState<Patient[]>(
    initial ?? patientsService.getPatients(),
  );

  const create = useCallback((data: CreatePatientInput) => {
    const created = patientsService.createPatient(data);
    setPatients(patientsService.getPatients());
    return created;
  }, []);

  return { patients, create, setPatients };
}
