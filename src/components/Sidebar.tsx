import React from 'react';
import { Plane, ChevronRight } from 'lucide-react';
import type { Project } from '../types';

interface SidebarProps {
    activeProject: string;
    setActiveProject: (p: string) => void;
    projects: Record<string, Project>;
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeProject, setActiveProject, projects, className }) => {
    const projectList = Object.values(projects);
    return (
        <aside className={`w-64 flex-none bg-slate-950/80 border-r border-cyan-900/30 flex flex-col z-40 backdrop-blur-md ${className || ''}`}>
            <div className="p-4 border-b border-cyan-900/20">
                <label className="text-[8px] text-cyan-500 font-black uppercase block mb-3 tracking-widest">
                    GESTIÓN DE PROYECTOS
                </label>
                <div className="space-y-1">
                    <button
                        onClick={() => setActiveProject('ALL')}
                        className={`w-full flex items-center justify-between p-2 rounded text-[10px] font-black transition-all ${activeProject === 'ALL' ? 'bg-cyan-500 text-black' : 'text-cyan-500 hover:bg-cyan-500/10'
                            }`}
                    >
                        TODOS LOS PROYECTOS <Plane className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <label className="text-[8px] text-slate-500 font-black uppercase px-2 mb-2 block">Active Deployments</label>
                {projectList.map(proj => (
                    <button
                        key={proj.name}
                        onClick={() => setActiveProject(proj.name)}
                        className={`w-full flex items-center gap-3 p-3 rounded group transition-all text-left ${activeProject === proj.name ? 'bg-slate-900 border border-cyan-500/50' : 'hover:bg-slate-900/50 border border-transparent'
                            }`}
                    >
                        <div className={`w-1 h-4 rounded-full ${activeProject === proj.name ? 'bg-cyan-400' : 'bg-slate-800'}`}></div>
                        <div className="flex-1">
                            <div className="text-[10px] text-white font-black uppercase truncate">{proj.customer}</div>
                            <div className="text-[8px] text-slate-500 font-bold group-hover:text-cyan-500/50 transition-colors">{proj.name} | {proj.ac}</div>
                        </div>
                        <ChevronRight className={`w-3 h-3 transition-transform ${activeProject === proj.name ? 'text-cyan-400' : 'text-slate-700 opacity-0 group-hover:opacity-100'}`} />
                    </button>
                ))}

                {projectList.length === 0 && (
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-slate-600 font-black italic">NO ACTIVE DATA LINKS</p>
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
