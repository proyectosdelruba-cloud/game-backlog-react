import { Flame } from 'lucide-react';

export function ProgressRing({ completados, total, size = 96, strokeWidth = 8 }) {
  const radio = (size - strokeWidth) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const porcentaje = total > 0 ? Math.min(completados / total, 1) : 0;
  const offset = circunferencia * (1 - porcentaje);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radio} fill="none"
          stroke="#7C3AED" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circunferencia} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">{Math.round(porcentaje * 100)}%</span>
        <span className="text-[10px] text-white/50">completado</span>
      </div>
    </div>
  );
}

export function DailyStreak({ racha }) {
  return (
    <div className="glass flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center">
        <Flame size={18} strokeWidth={2} className="text-orange-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-white leading-none">{racha} {racha === 1 ? 'día' : 'días'}</p>
        <p className="text-[11px] text-white/50 mt-1">Racha activa — vuelve mañana para seguir sumando</p>
      </div>
    </div>
  );
}