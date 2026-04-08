import React from 'react';
import { Plane, ChevronRight } from 'lucide-react';
import type { Project, Task } from '../types';

interface SidebarProps {
    activeProject: string;
    setActiveProject: (p: string) => void;
    projects: Record<string, Project>;
    tasks: Task[]; // Para calcular contadores por proyecto
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeProject, setActiveProject, projects, tasks, className }) => {
    const projectList = Object.values(projects);
    return (
        <aside className={`w-64 flex-none bg-slate-950/80 border-r border-cyan-900/30 flex flex-col z-40 backdrop-blur-md ${className || ''}`}>
            <div className="p-4 border-b border-cyan-900/20">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative w-full flex justify-center py-4">
                        {/* Filtro CSS para convertir negro en blanco manteniendo el rojo */}
                        <img
                            src="/logo_xtreme.png"
                            alt="X-TREME AVIATION"
                            className="relative w-full max-w-[200px] h-auto object-contain px-2 transition-all duration-700"
                            style={{
                                filter: 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.1)'
                            }}
                        />
                    </div>
                    <label className="text-[9px] text-cyan-500 font-black uppercase block tracking-widest text-center w-full mt-2">
                        GESTIÓN DE PROYECTOS
                    </label>
                </div>
                <div className="space-y-1">
                    <button
                        onClick={() => setActiveProject('ALL')}
                        className={`w-full flex items-center justify-between p-2 rounded text-[10px] font-black transition-all ${activeProject === 'ALL' ? 'bg-cyan-500 text-black' : 'text-cyan-500 hover:bg-cyan-500/10'
                            }`}
                    >
                        FLOTA ACTIVA <Plane className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <label className="text-[8px] text-slate-500 font-black uppercase px-2 mb-2 block">DESPLIEGUES ACTIVOS</label>
                {projectList.map(proj => {
                    const projTasks = tasks.filter(t => t.project === proj.name);
                    const total = projTasks.length;
                    const logradas = projTasks.filter(t => t.progress === 100).length;
                    const pendientes = total - logradas;
                    const isActive = activeProject === proj.name;

                    return (
                        <button
                            key={proj.name}
                            onClick={() => setActiveProject(proj.name)}
                            className={`w-full flex flex-col gap-2 p-3 rounded group transition-all text-left ${isActive ? 'bg-slate-900 border border-cyan-500/50' : 'hover:bg-slate-900/50 border border-transparent'
                                }`}
                        >
                            {/* Fila principal: indicador + nombre + chevron */}
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-1 h-4 rounded-full flex-none ${isActive ? 'bg-cyan-400' : 'bg-slate-800'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-white font-black uppercase truncate">{proj.customer}</div>
                                    <div className="text-[8px] text-slate-500 font-bold group-hover:text-cyan-500/50 transition-colors">{proj.name} | {proj.ac}</div>
                                </div>
                                <ChevronRight className={`w-3 h-3 flex-none transition-transform ${isActive ? 'text-cyan-400' : 'text-slate-700 opacity-0 group-hover:opacity-100'}`} />
                            </div>

                            {/* Contadores de tareas */}
                            {total > 0 && (
                                <div className="grid grid-cols-3 gap-1 w-full text-center">
                                    {/* TOTALES */}
                                    <div className="flex flex-col items-center py-1 rounded bg-slate-800/60">
                                        <span className="text-[12px] font-black text-white leading-none">{total}</span>
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">TOTALES</span>
                                    </div>
                                    {/* LOGRADAS */}
                                    <div className="flex flex-col items-center py-1 rounded bg-emerald-900/40 border border-emerald-500/20">
                                        <span className="text-[12px] font-black text-emerald-400 leading-none">{logradas}</span>
                                        <span className="text-[7px] font-bold text-emerald-600 uppercase tracking-wide mt-0.5">LOGRADAS</span>
                                    </div>
                                    {/* PENDIENTES */}
                                    <div className="flex flex-col items-center py-1 rounded bg-amber-900/30 border border-amber-500/20">
                                        <span className="text-[12px] font-black text-amber-400 leading-none">{pendientes}</span>
                                        <span className="text-[7px] font-bold text-amber-600 uppercase tracking-wide mt-0.5">PENDIENTES</span>
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}

                {projectList.length === 0 && (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-slate-600 font-black italic">SIN DATOS ACTIVOS</p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-black/20 border-t border-cyan-900/20">
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] font-black text-cyan-500/40">
                        <span>UPLINK_SPEED</span>
                        <span>4.2 GB/S</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="w-[80%] h-full bg-cyan-500/40"></div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
