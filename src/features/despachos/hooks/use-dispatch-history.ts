"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { listDispatches } from "@/services/dispatch.service";
import type { DispatchListItem } from "@/types/dispatch";

export const HISTORY_LIMIT = 300;

// Últimos despachos, actualizados en tiempo real cuando cualquier usuario escanea, cancela o
// corrige: Realtime solo avisa del cambio y la lista se vuelve a pedir con las mismas reglas.
export function useDispatchHistory() {
  const [rows, setRows] = useState<DispatchListItem[]>([]);

  const refreshRows = useCallback(async () => {
    setRows(await listDispatches(HISTORY_LIMIT));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("despachos-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "despachos" },
        () => void refreshRows(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshRows]);

  return { rows, setRows, refreshRows };
}
