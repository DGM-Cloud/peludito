"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { fetchUbigeo, type UbigeoPlace } from "@/services/ubigeo.service";
import { fold } from "@/utils/client-fields";
import { useEffect, useState } from "react";

type Value = {
  department: string;
  province: string;
  district: string;
};

type Props = {
  value: Value;
  onChange: (next: Value) => void;
};

export function UbigeoFields({ value, onChange }: Props) {
  const [departments, setDepartments] = useState<UbigeoPlace[]>([]);
  const [provinces, setProvinces] = useState<UbigeoPlace[]>([]);
  const [districts, setDistricts] = useState<UbigeoPlace[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetchUbigeo({}, controller.signal)
      .then((places) => {
        setDepartments(places);
        setStatus(places.length > 0 ? "ready" : "error");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (departmentId || !value.department || departments.length === 0) return;
    const match = departments.find((place) => fold(place.name) === fold(value.department));
    if (match) setDepartmentId(match.id);
  }, [departmentId, departments, value.department]);

  useEffect(() => {
    if (provinceId || !value.province || provinces.length === 0) return;
    const match = provinces.find((place) => fold(place.name) === fold(value.province));
    if (match) setProvinceId(match.id);
  }, [provinceId, provinces, value.province]);

  useEffect(() => {
    if (districtId || !value.district || districts.length === 0) return;
    const match = districts.find((place) => fold(place.name) === fold(value.district));
    if (match) setDistrictId(match.id);
  }, [districtId, districts, value.district]);

  useEffect(() => {
    if (!departmentId) {
      setProvinces([]);
      return;
    }
    const controller = new AbortController();
    setLoadingProvinces(true);
    void fetchUbigeo({ department: departmentId }, controller.signal)
      .then((places) => {
        setProvinces(places);
        setLoadingProvinces(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadingProvinces(false);
        setStatus("error");
      });
    return () => controller.abort();
  }, [departmentId]);

  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    const controller = new AbortController();
    setLoadingDistricts(true);
    void fetchUbigeo({ province: provinceId }, controller.signal)
      .then((places) => {
        setDistricts(places);
        setLoadingDistricts(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadingDistricts(false);
        setStatus("error");
      });
    return () => controller.abort();
  }, [provinceId]);

  if (status === "error") {
    return (
      <>
        <p className="text-xs text-muted sm:col-span-6">
          No se pudo consultar el padrón de ubigeo. Puedes escribirlos a mano.
        </p>
        <div className="sm:col-span-2">
          <Input
            label="Departamento"
            value={value.department}
            onChange={(event) => onChange({ ...value, department: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Provincia"
            value={value.province}
            onChange={(event) => onChange({ ...value, province: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Distrito"
            value={value.district}
            onChange={(event) => onChange({ ...value, district: event.target.value })}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sm:col-span-2">
        <Select
          label="Departamento"
          disabled={status === "loading"}
          value={departmentId}
          options={[
            { value: "", label: status === "loading" ? "Cargando…" : "Elige un departamento" },
            ...departments.map((place) => ({ value: place.id, label: place.name })),
          ]}
          onChange={(event) => {
            const id = event.target.value;
            const place = departments.find((item) => item.id === id);
            setDepartmentId(id);
            setProvinceId("");
            setDistrictId("");
            setProvinces([]);
            setDistricts([]);
            setLoadingProvinces(Boolean(id));
            setLoadingDistricts(false);
            onChange({
              department: place?.name ?? "",
              province: "",
              district: "",
            });
          }}
        />
      </div>
      <div className="sm:col-span-2">
        <Select
          label="Provincia"
          disabled={!departmentId || loadingProvinces}
          value={provinceId}
          options={[
            {
              value: "",
              label: !departmentId
                ? "Primero el departamento"
                : loadingProvinces
                  ? "Cargando…"
                  : "Elige una provincia",
            },
            ...provinces.map((place) => ({ value: place.id, label: place.name })),
          ]}
          onChange={(event) => {
            const id = event.target.value;
            const place = provinces.find((item) => item.id === id);
            setProvinceId(id);
            setDistrictId("");
            setDistricts([]);
            setLoadingDistricts(Boolean(id));
            onChange({
              ...value,
              province: place?.name ?? "",
              district: "",
            });
          }}
        />
      </div>
      <div className="sm:col-span-2">
        <Select
          label="Distrito"
          disabled={!provinceId || loadingDistricts}
          value={districtId}
          options={[
            {
              value: "",
              label: !provinceId
                ? "Primero la provincia"
                : loadingDistricts
                  ? "Cargando…"
                  : "Elige un distrito",
            },
            ...districts.map((place) => ({ value: place.id, label: place.name })),
          ]}
          onChange={(event) => {
            const id = event.target.value;
            const place = districts.find((item) => item.id === id);
            setDistrictId(id);
            onChange({
              ...value,
              district: place?.name ?? "",
            });
          }}
        />
      </div>
    </>
  );
}
