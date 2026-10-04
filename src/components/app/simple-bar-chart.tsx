interface Item {
  label: string;
  value: number;
}

export function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: Item[];
}) {
  const max = Math.max(
    1,
    ...data.map((item) => item.value)
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0B1626]/70 p-4 shadow-[0_16px_50px_rgba(0,0,0,.18)] backdrop-blur-xl">
      <h3 className="mb-4 text-xs font-semibold text-slate-200">
        {title}
      </h3>

      <div className="space-y-3">
        {data.slice(0, 10).map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[110px_1fr_42px] items-center gap-3"
          >
            <span className="truncate text-[10px] text-slate-500">
              {item.label}
            </span>

            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                style={{
                  width: `${Math.max(
                    4,
                    (item.value / max) * 100
                  )}%`,
                }}
              />
            </div>

            <span className="text-right text-[10px] font-semibold text-slate-300">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
