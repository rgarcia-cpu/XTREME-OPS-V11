import React from 'react';
import type { Task, Project } from '../types';

interface PrintReportProps {
    tasks: Task[];
    projects: Record<string, Project>;
    activeProject: string;
    viewFilter: 'ALL' | 'PENDING' | 'TODAY';
}

const PrintReport: React.FC<PrintReportProps> = ({ tasks, projects, activeProject, viewFilter }) => {
    const today = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const activeProjectData = projects[activeProject];

    // Obtener lista de proyectos únicos con tareas
    const uniqueProjectsWithTasks = [...new Set(tasks.map(t => t.project))].sort();

    return (
        <div className="hidden print:block p-8 bg-white text-black font-sans">
            {/* Header X-Treme Style */}
            <header className="border-b-4 border-black pb-4 mb-4 break-inside-avoid">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">XTREME AVIATION - OPS REPORT</h1>
                        <p className="text-sm font-bold text-gray-600 mt-2 uppercase">
                            {viewFilter === 'PENDING' ? 'REPORTE DE TAREAS PENDIENTES' :
                                viewFilter === 'TODAY' ? 'REPORTE TÁCTICO DEL DÍA' :
                                    activeProject === 'ALL' ? 'REPORTE GLOBAL DE FLOTA' : `LP# ${activeProjectData?.lp || 'N/A'}`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-black bg-black text-white px-2 py-1 mb-2 inline-block uppercase italic">
                            {activeProject === 'ALL' ? 'FLOTA ACTIVA' : activeProjectData?.name || activeProject}
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">FECHA REPORTE</p>
                        <p className="text-lg font-black leading-none">{today.toUpperCase()}</p>
                    </div>
                </div>

                {/* Detalle o Resumen (Dependiendo de si es ALL o Proyecto Específico) */}
                {activeProject !== 'ALL' && activeProjectData ? (
                    <div className="mt-4 grid grid-cols-4 gap-4 text-[9px] font-bold uppercase">
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">CUSTOMER:</span>
                            <span className="text-[11px] font-black">{activeProjectData.customer || 'N/A'}</span>
                        </div>
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">A/C | MODEL | MSN:</span>
                            <span>{activeProjectData.ac || '-'} | {activeProjectData.model || '-'} | {activeProjectData.msn || '-'}</span>
                        </div>
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">WO | INTERVAL:</span>
                            <span>{activeProjectData.wo || 'N/A'} | {activeProjectData.intervalDays} DÍAS</span>
                        </div>
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">PM (PROJECT MANAGER):</span>
                            <span>{activeProjectData.pm || 'N/A'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-3 gap-4 text-[9px] font-bold uppercase">
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">AIRCRAFT ACTIVOS (A/C):</span>
                            <span className="text-[11px] font-black">{uniqueProjectsWithTasks.length} A/C(S)</span>
                        </div>
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">CUSTOMERS ACTIVOS:</span>
                            <span className="font-black">
                                {[...new Set(uniqueProjectsWithTasks.map(p => projects[p]?.customer).filter(Boolean))].join(', ') || '-'}
                            </span>
                        </div>
                        <div className="bg-gray-50 p-2 border border-gray-300">
                            <span className="text-gray-500 block text-[7px] mb-1">TOTAL TAREAS:</span>
                            <span>{tasks.length} REGISTRADAS</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Iterar sobre proyectos (v10 Style) */}
            {uniqueProjectsWithTasks.map((projName) => {
                const projData = projects[projName];
                const projTasks = tasks.filter(t => t.project === projName).sort((a, b) => a.start - b.start);

                if (projTasks.length === 0) return null;

                return (
                    <section key={projName} className="mb-10 break-inside-avoid-page">
                        {/* Sub-header por unidad */}
                        <div className="bg-black text-white p-2 px-4 flex justify-between items-center font-black text-xs uppercase tracking-wider mb-0 border-b border-black">
                            <div className="flex gap-4">
                                <span>A/C: {projData?.ac || projName}</span>
                                {projData && <span className="text-gray-400">| LP#: {projData.lp || '-'} | WO: {projData.wo}</span>}
                            </div>
                            <div className="text-[9px] italic">
                                {viewFilter === 'PENDING' ? 'SOLO PENDIENTES' : 'PLAN TÁCTICO'}
                            </div>
                        </div>

                        {/* Tasks Table */}
                        <table className="w-full border-collapse border border-black text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-2 text-left w-16 uppercase font-black">TIE</th>
                                    <th className="border border-black p-2 text-left w-16 uppercase font-black">DUR.</th>
                                    <th className="border border-black p-2 text-left w-16 uppercase font-black">PROG.</th>
                                    <th className="border border-black p-2 text-left uppercase font-black">DESCRIPCIÓN DE LA TAREA</th>
                                    <th className="border border-black p-2 text-left w-36 uppercase font-black">ESTADO / FIRMA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projTasks.map((task) => (
                                    <tr key={task.id} className="break-inside-avoid">
                                        <td className="border border-black p-2 font-black whitespace-nowrap">DÍA {task.start + 1}</td>
                                        <td className="border border-black p-2 font-bold whitespace-nowrap">
                                            {task.duration} d {task.durationHours > 0 ? `| ${task.durationHours} h` : ''}
                                        </td>
                                        <td className="border border-black p-2 font-black text-center">{task.progress}%</td>
                                        <td className="border border-black p-2">
                                            <div className="font-black text-[11px] uppercase">{task.title}</div>
                                            {task.description && (
                                                <div className="text-[9px] text-gray-700 leading-tight italic mt-0.5 line-clamp-2">{task.description}</div>
                                            )}
                                        </td>
                                        <td className="border border-black p-2 text-center align-middle">
                                            {task.progress === 100 ? (
                                                <div className="inline-block px-3 py-0.5 border border-black rounded font-black text-[9px] bg-white">
                                                    DONE
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 text-[9px] font-bold flex items-center justify-center gap-2">
                                                    <div className="w-3.5 h-3.5 border border-black"></div> [ ] PENDIENTE
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                );
            })}

            {tasks.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed border-gray-300 text-gray-400 font-bold uppercase">
                    NO HAY TAREAS QUE COINCIDAN CON EL FILTRO SELECCIONADO
                </div>
            )}

            {/* Control Panel Area / Additional Info */}
            <div className="mt-8 border-t-2 border-black pt-8 break-inside-avoid">
                <div className="grid grid-cols-2 gap-12 text-center">
                    <div>
                        <div className="h-0.5 bg-black mb-2"></div>
                        <p className="text-[10px] font-black uppercase">FIRMA PROJECT MANAGER</p>
                        <p className="text-[8px] text-gray-500 mt-1 uppercase">Responsable Operativo X-Treme Aviation</p>
                    </div>
                    <div>
                        <div className="h-0.5 bg-black mb-2"></div>
                        <p className="text-[10px] font-black uppercase">FIRMA QA / INSPECTOR</p>
                        <p className="text-[8px] text-gray-500 mt-1 uppercase">Control de Calidad y Calibración</p>
                    </div>
                </div>

                <footer className="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center text-[7px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>STRATEGIC OPS v11.0.4 // X-TREME AVIATION CORP // REPORT_HASH: {activeProject}_{new Date().getTime().toString(36).toUpperCase()}</span>
                    <span>X-TREME OPS GEN REPORT</span>
                </footer>
            </div>
        </div>
    );
};

export default PrintReport;
