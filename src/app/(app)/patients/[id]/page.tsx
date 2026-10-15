"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PatientHub } from "@/components/patients/PatientHub";
import { useDemo } from "@/context/DemoProvider";
import { patientsService } from "@/services/patients.service";
import { use } from "react";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { version } = useDemo();
  void version;
  const patient = patientsService.getPatientById(id);

  if (!patient) {
    return (
      <PageContainer>
        <p className="text-sm text-muted">Paciente no encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PatientHub patient={patient} />
    </PageContainer>
  );
}
