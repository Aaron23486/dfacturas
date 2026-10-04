"use client";

import {
  Activity,
  Clock3,
  Medal,
  PackageCheck,
  PackageOpen,
  X,
} from "lucide-react";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatToday } from "@/lib/utils/date";
import type { DailyKpis } from "@/types/dispatch";

const STORAGE_KEY = "facturacion-v2:metrics-fab-position";
const BUTTON_SIZE = 52;
const EDGE = 12;
const HEADER_GUARD = 66;
const DRAG_THRESHOLD = 5;

interface Point {
  x: number;
  y: number;
}

function clampPoint(point: Point): Point {
  if (typeof window === "undefined") {
    return point;
  }

  return {
    x: Math.min(
      Math.max(EDGE, point.x),
      window.innerWidth - BUTTON_SIZE - EDGE
    ),
    y: Math.min(
      Math.max(HEADER_GUARD, point.y),
      window.innerHeight - BUTTON_SIZE - EDGE
    ),
  };
}

function defaultPoint(): Point {
  if (typeof window === "undefined") {
    return { x: 0, y: 100 };
  }

  return clampPoint({
    x: window.innerWidth - BUTTON_SIZE - 22,
    y: Math.max(120, window.innerHeight * 0.38),
  });
}

function FloatingMetricsComponent({
  data,
}: {
  data: DailyKpis;
}) {
  const [position, setPosition] = useState<Point>({
    x: 0,
    y: 120,
  });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const pointerStart = useRef<Point | null>(null);
  const positionStart = useRef<Point | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? (JSON.parse(saved) as Point) : null;

        setPosition(
          parsed &&
            Number.isFinite(parsed.x) &&
            Number.isFinite(parsed.y)
            ? clampPoint(parsed)
            : defaultPoint()
        );
      } catch {
        setPosition(defaultPoint());
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onResize() {
      setPosition((current) => clampPoint(current));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function save(point: Point) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(point));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);

    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    positionStart.current = position;
    dragging.current = false;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pointerStart.current || !positionStart.current) {
      return;
    }

    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;

    if (
      Math.abs(dx) > DRAG_THRESHOLD ||
      Math.abs(dy) > DRAG_THRESHOLD
    ) {
      dragging.current = true;
    }

    if (!dragging.current) {
      return;
    }

    setPosition(
      clampPoint({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      })
    );
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragging.current) {
      setPosition((current) => {
        const next = clampPoint(current);
        save(next);
        return next;
      });
    } else {
      setOpen((current) => !current);
    }

    pointerStart.current = null;
    positionStart.current = null;
    dragging.current = false;
  }

  if (!ready) {
    return null;
  }

  const panelWidth = 290;
  const panelHeight = 278;

  const preferLeft =
    position.x + BUTTON_SIZE + panelWidth + 16 > window.innerWidth;

  const rawPanelX = preferLeft
    ? position.x - panelWidth - 10
    : position.x + BUTTON_SIZE + 10;

  const rawPanelY = position.y - 18;

  const panelX = Math.min(
    Math.max(EDGE, rawPanelX),
    window.innerWidth - panelWidth - EDGE
  );

  const panelY = Math.min(
    Math.max(HEADER_GUARD, rawPanelY),
    window.innerHeight - panelHeight - EDGE
  );

  return (
    <>
      {open ? (
        <div
          className="fixed z-[79] w-[290px] rounded-2xl border border-amber-500/15 bg-[#0B1626]/88 p-4 shadow-[0_22px_70px_rgba(0,0,0,.46),0_0_30px_rgba(245,158,11,.05)] backdrop-blur-2xl"
          style={{
            left: panelX,
            top: panelY,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-100">
                Métricas del día
              </p>
              <p className="text-[10px] text-slate-600">
                {formatToday()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300"
              aria-label="Cerrar métricas"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={PackageCheck}
              label="Despachadas"
              value={String(data.despachadas)}
            />
            <Metric
              icon={PackageOpen}
              label="En proceso"
              value={String(data.atendiendo)}
            />
            <Metric
              icon={Clock3}
              label="Finalizadas"
              value={String(data.finalizadas)}
            />
            <Metric
              icon={Activity}
              label="Promedio"
              value={`${data.promedioMinutos} min`}
            />
          </div>

          <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.07em] text-slate-600">
              <Medal className="size-3 text-amber-300" />
              Ranking
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <Ranking number={1} name={data.top[0]?.nombre ?? "-"} />
              <Ranking number={2} name={data.top[1]?.nombre ?? "-"} />
              <Ranking number={3} name={data.top[2]?.nombre ?? "-"} />
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Abrir métricas del día"
        title="Métricas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className="fixed z-[80] grid size-[52px] touch-none place-items-center rounded-full border border-amber-400/25 bg-[#101C2C]/82 text-amber-300 shadow-[0_14px_35px_rgba(0,0,0,.45),0_0_24px_rgba(245,158,11,.09)] backdrop-blur-xl transition hover:border-amber-400/45 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <Activity className="size-5" />
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,.8)]" />
      </button>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.025] p-2.5">
      <Icon className="mb-2 size-3.5 text-amber-400" />
      <p className="text-[9px] uppercase tracking-[0.06em] text-slate-600">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-100">
        {value}
      </p>
    </div>
  );
}

function Ranking({
  number,
  name,
}: {
  number: number;
  name: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "grid size-5 place-items-center rounded-md border text-[9px] font-bold",
          number === 1
            ? "border-amber-300/25 bg-amber-300/10 text-amber-300"
            : "border-white/8 bg-white/[0.03] text-slate-500",
        ].join(" ")}
      >
        {number}
      </span>

      <span className="truncate">
        Top {number} — {name}
      </span>
    </div>
  );
}

export const FloatingMetrics = memo(FloatingMetricsComponent);
