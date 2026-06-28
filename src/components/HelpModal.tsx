import { X, Info, Trophy, Target, AlertCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800/80 p-5 border-b border-slate-700/50 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
              <Info className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Sistema de Puntuación</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-emerald-400 font-bold text-lg mb-3">
              <Trophy className="w-5 h-5" />
              ¿Cómo se obtienen los puntos?
            </h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 min-w-[50px]">+3 pts</span>
                <span>Si aciertas el <strong>marcador exacto</strong> del partido (ej. pronosticas 2-1 y el partido termina 2-1).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 min-w-[50px]">+2 pts</span>
                <span>Si aciertas la <strong>tendencia</strong> del partido (quién gana o si hay empate), pero no el marcador exacto (ej. pronosticas 2-0 y el partido termina 1-0).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-slate-500 min-w-[50px]">+0 pts</span>
                <span>Si no aciertas ni el ganador ni el marcador.</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-3">
              <Target className="w-5 h-5" />
              Empates en la Tabla de Posiciones
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              En caso de que varios jugadores terminen con la misma cantidad de puntos, la tabla los ordenará utilizando criterios de desempate (como cantidad de marcadores exactos o aciertos de goles). 
            </p>
            <div className="bg-amber-950/50 p-4 rounded-xl border border-amber-500/20 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                <strong>¡IMPORTANTE!</strong> Este ordenamiento es <strong>exclusivamente para mejorar la visualización</strong> de la tabla y evitar que los usuarios estén "saltando" de posiciones constantemente. 
                <br/><br/>
                Al finalizar el torneo, <strong>solo se tomarán en cuenta los PUNTOS TOTALES</strong> para definir a los ganadores. Ningún otro récord o ranking adicional (aciertos, rachas, etc.) afectará el premio. Si hay un empate en puntos en el primer lugar (o cualquier puesto premiado), <strong>el premio simplemente se divide en partes iguales</strong> entre los empatados, ya que todos son ganadores del mismo puesto.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-5 border-t border-slate-700/50 text-center sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-8 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
