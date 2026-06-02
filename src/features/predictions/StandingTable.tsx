import type { CalculatedTeam } from './QuinielaForm';
import { Star } from 'lucide-react';
import { getFlagUrl } from '../../utils/flags';

interface StandingTableProps {
  groupName: string;
  teams: CalculatedTeam[];
}

export default function StandingTable({ groupName, teams }: StandingTableProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-md font-mono">
            Grupo {groupName}
          </span>
          Tabla de Posiciones
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 text-slate-400 font-medium bg-slate-900/20">
              <th className="py-2.5 px-3 text-center w-8">#</th>
              <th className="py-2.5 px-3">Equipo</th>
              <th className="py-2.5 px-2 text-center w-10">PJ</th>
              <th className="py-2.5 px-2 text-center w-8">G</th>
              <th className="py-2.5 px-2 text-center w-8">E</th>
              <th className="py-2.5 px-2 text-center w-8">P</th>
              <th className="py-2.5 px-2 text-center w-10">GF</th>
              <th className="py-2.5 px-2 text-center w-10">GC</th>
              <th className="py-2.5 px-2 text-center w-10">DG</th>
              <th className="py-2.5 px-3 text-center w-12 font-bold text-white bg-slate-800/40">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/20">
            {teams.map((team, index) => {
              const position = index + 1;
              const qualifies = position <= 2;
              
              return (
                <tr
                  key={team.name}
                  className={`transition-all duration-300 ${
                    qualifies 
                      ? 'bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]' 
                      : 'hover:bg-slate-700/20'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        position === 1
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : position === 2
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-500'
                      }`}
                    >
                      {position}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      {getFlagUrl(team.name) && (
                        <img src={getFlagUrl(team.name)} alt="" className="w-4.5 h-3 object-cover rounded border border-slate-700/50 flex-shrink-0" />
                      )}
                      <span className={qualifies ? 'text-white' : 'text-slate-300'}>
                        {team.name}
                      </span>
                      {qualifies && (
                        <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-300">{team.played}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">{team.won}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">{team.drawn}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">{team.lost}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">{team.goalsFor}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">{team.goalsAgainst}</td>
                  <td
                    className={`py-2.5 px-2 text-center font-mono font-medium ${
                      team.goalDifference > 0
                        ? 'text-emerald-400'
                        : team.goalDifference < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-white bg-slate-800/20">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
