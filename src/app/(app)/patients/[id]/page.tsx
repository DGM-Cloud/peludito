import { PageContainer } from "@/components/layout/PageContainer";
import { PatientHub } from "@/components/patients/PatientHub";
import { patientsService } from "@/services/patients.service";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = patientsService.getPatientById(id);
  return { title: patient?.name ?? "Paciente" };
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = patientsService.getPatientById(id);
  if (!patient) notFound();

  return (
    <PageContainer>
      <PatientHub patient={patient} />
    </PageContainer>
  );
}
