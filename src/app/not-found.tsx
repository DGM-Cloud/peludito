import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function NotFound() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          El recurso que buscas no existe en esta demo.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button>Ir al dashboard</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
