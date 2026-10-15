"use client";

import { useCallback, useState } from "react";
import { appointmentsService } from "@/services/appointments.service";
import type { Appointment, CreateAppointmentInput } from "@/types/appointment";

export function useAppointments(initial?: Appointment[]) {
  const [appointments, setAppointments] = useState<Appointment[]>(
    initial ?? appointmentsService.getAppointments(),
  );

  const refresh = useCallback(() => {
    setAppointments(appointmentsService.getAppointments());
  }, []);

  const create = useCallback(async (data: CreateAppointmentInput) => {
    const created = await appointmentsService.createAppointment(data);
    setAppointments(appointmentsService.getAppointments());
    return created;
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: Appointment["status"]) => {
      await appointmentsService.updateStatus(id, status);
      setAppointments(appointmentsService.getAppointments());
    },
    [],
  );

  return { appointments, create, updateStatus, refresh };
}
