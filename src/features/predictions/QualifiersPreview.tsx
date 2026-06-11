import { Trophy, ShieldAlert, Star } from 'lucide-react';
import { getFlagUrl } from '../../utils/flags';

interface GroupQualifiers {
  first: string;
  second: string;
}

interface QualifiersPreviewProps {
  qualifiers: Record<string, GroupQualifiers>;
}

export default function QualifiersPreview({ qualifiers }: QualifiersPreviewProps) {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const totalQualifiers = Object.values(qualifiers).filter(q => q.first && q.second).length * 2;
  const targetQualifiers = groups.length * 2;

  return (
    <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-700/50 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5.5 h-5.5 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Tus Clasificados a Octavos</h2>
            <p className="text-slate-400 text-xs">Simulación en tiempo real según tus predicciones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Progreso:</span>
          <div className="bg-slate-700/50 px-3 py-1 rounded-full border border-slate-600/30 font-mono text-xs text-emerald-400 font-bold">
            {totalQualifiers} / {targetQualifiers} Equipos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {groups.map((group) => {
          const q = qualifiers[group] || { first: '', second: '' };
          const hasFirst = !!q.first;
          const hasSecond = !!q.second;
          const flagUrl1 = hasFirst ? getFlagUrl(q.first) : '';
          const flagUrl2 = hasSecond ? getFlagUrl(q.second) : '';

          return (
            <div
              key={group}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700/50 transition-colors"
            >
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2.5 font-mono">
                Grupo {group}
              </div>

              <div className="space-y-2">
                {/* 1st Place */}
                <div
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold ${
                    hasFirst
                      ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
                      : 'bg-slate-800/10 border-slate-800 text-slate-600 border-dashed'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-yellow-500/60 font-mono flex-shrink-0">1º</span>
                    {flagUrl1 && (
                      <img src={flagUrl1} alt="" className="w-4 h-3 object-cover rounded border border-yellow-500/10 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {hasFirst ? q.first : <span className="print:hidden">Por definir</span>}
                    </span>
                  </div>
                  {hasFirst && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
                </div>

                {/* 2nd Place */}
                <div
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold ${
                    hasSecond
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800/10 border-slate-800 text-slate-600 border-dashed'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-emerald-500/60 font-mono flex-shrink-0">2º</span>
                    {flagUrl2 && (
                      <img src={flagUrl2} alt="" className="w-4 h-3 object-cover rounded border border-emerald-500/10 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {hasSecond ? q.second : <span className="print:hidden">Por definir</span>}
                    </span>
                  </div>
                  {hasSecond && <Star className="w-3 h-3 fill-emerald-500 text-emerald-400 flex-shrink-0" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalQualifiers < targetQualifiers && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-xl">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>Ingresa los marcadores para todos los partidos de un grupo para definir sus dos clasificados.</span>
        </div>
      )}
    </div>
  );
}
