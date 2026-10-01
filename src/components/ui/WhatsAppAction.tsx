"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MessageCircle } from "lucide-react";

export function WhatsAppAction({
  label = "WhatsApp",
  message,
}: {
  label?: string;
  message?: string;
}) {
  const { toast } = useToast();

  return (
    <Button
      variant="outline"
      size="sm"
      leftIcon={<MessageCircle className="h-4 w-4" />}
      onClick={() =>
        toast(
          message ??
            "Integración WhatsApp — próxima implementación.",
        )
      }
    >
      {label}
    </Button>
  );
}
