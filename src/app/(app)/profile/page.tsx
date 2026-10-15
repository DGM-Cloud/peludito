"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useDemo } from "@/context/DemoProvider";

export default function ProfilePage() {
  const { fullName, roleLabel, email, clinic } = useDemo();
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <PageContainer>
      <h1 className="mb-6 text-2xl font-semibold">Perfil</h1>
      <Card className="flex items-center gap-4">
        <Avatar initials={initials || "P"} size="lg" />
        <div>
          <p className="text-lg font-semibold">{fullName}</p>
          <p className="text-sm text-muted">{roleLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {email} · {clinic.name}
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
