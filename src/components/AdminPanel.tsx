import React, { useState } from 'react';
import { Plus, Trash2, Folder, Plane, X, User, Hash, Calendar, Clock, Edit2 } from 'lucide-react';
import type { Project, Task } from '../types';

interface AdminPanelProps {
    projects: Record<string, Project>;
    activeProject: string; // Nueva prop
    onAddProject: (project: Project) => void;
    onAddTasks: (tasks: Task[]) => void;
    onDeleteProject: (name: string) => void;
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ projects, activeProject, onAddProject, onAddTasks, onDeleteProject, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Project>({
        name: '',
        customer: '',
        ac: '',
        model: '',
        msn: '',
        wo: '',
        lp: '',
        pm: '',
        startDate: new Date().toISOString().split('T')[0],
        intervalDays: 45
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const currentProjectData = projects[activeProject];

            let projectName = activeProject !== 'ALL' ? activeProject : "";
            let customer = currentProjectData?.customer || "";
            let wo = currentProjectData?.wo || "";
            let ac = currentProjectData?.ac || "";
            let model = currentProjectData?.model || "";
            let msn = currentProjectData?.msn || "";
            let lp = currentProjectData?.lp || "";
            let pm = currentProjectData?.pm || "";
            let interval = currentProjectData?.intervalDays || 45;
            let projectStartDateStr = currentProjectData?.startDate || new Date().toISOString().split('T')[0];

            const tasks: Task[] = [];
            let taskTableStarted = false;

            lines.forEach((line, rowIndex) => {
                const rawLine = line.trim();
                const cols = rawLine.split(',').map(c => c.trim().replace(/"/g, ''));
                if (cols.length < 2) return;

                if (activeProject === 'ALL') {
                    // Mapeo Primera Fila (Ej: LP # 1 projects PROGRESS Project MANAGER: Ricardo,TASK start: 2/25/2026)
                    if (rowIndex === 0) {
                        const lpMatch = rawLine.match(/LP\s*#\s*([\d\w-]+)/i);
                        if (lpMatch) lp = lpMatch[1];

                        const pmMatch = rawLine.match(/MANAGER:\s*([^,]+)/i);
                        if (pmMatch) pm = pmMatch[1].trim();

                        const taskStartMatch = rawLine.match(/TASK start:\s*([\d/-]+)/i);
                        if (taskStartMatch) {
                            // Intentar formatear la fecha a YYYY-MM-DD para el input type="date"
                            try {
                                const parsed = new Date(taskStartMatch[1]);
                                if (!isNaN(parsed.getTime())) {
                                    projectStartDateStr = parsed.toISOString().split('T')[0];
                                }
                            } catch (e) { }
                        }
                    }

                    // Mapeo Segunda Fila (Ej: PROYECT PLAN,PLAN C-Check,ATLAS AIR - WO. 012106 - A/C: B737 N859AU,Interval Days:, 45)
                    if (rowIndex === 1) {
                        if (cols[1]) projectName = cols[1];

                        // Buscar ATLAS AIR, u otro cliente antes del guion
                        const rawData = rawLine.toUpperCase();
                        if (rawData.includes("ATLAS AIR")) customer = "ATLAS AIR";
                        else if (cols[2]) customer = cols[2].split('-')[0].trim();

                        const woMatch = rawData.match(/WO\.?\s*([A-Z0-9-]+)/);
                        if (woMatch) wo = woMatch[1];

                        const acMatch = rawData.match(/A\/C:\s*([A-Z0-9]+)\s*([A-Z0-9]+)/);
                        if (acMatch) {
                            model = acMatch[1]; // B737
                            ac = acMatch[2];    // N859AU
                        } else {
                            const fallbackAcMatch = rawData.match(/A\/C:\s*([A-Z0-9-\s]+)/);
                            if (fallbackAcMatch) {
                                const parts = fallbackAcMatch[1].trim().split(' ');
                                if (parts.length > 1) {
                                    model = parts[0];
                                    ac = parts.slice(1).join(' ');
                                } else {
                                    ac = parts[0];
                                }
                            }
                        }

                        const intervalMatch = rawLine.match(/Interval Days:,\s*(\d+)/i);
                        if (intervalMatch) interval = parseInt(intervalMatch[1]);
                    }
                }

                if (cols[0] === "ITEM#") {
                    taskTableStarted = true;
                    return;
                }

                if (taskTableStarted && cols[0] && cols[3]) {
                    // Columnas esperadas (0: ITEM#, 1: CATEGORY, 2: REMARKS, 3: DESCRIPTION, 4: Start Date, 5: Due Date, 6: SKILL)
                    let startDay = 0;
                    let durationDays = 1;

                    if (cols[4] && projectStartDateStr) {
                        try {
                            // Cuidado con formatos de fecha locales (ej: MM/DD/YYYY)
                            // Requerimos parsearlas con "new Date()" que es lo mejor compatible
                            const taskStartDate = new Date(cols[4]);
                            const projDate = new Date(projectStartDateStr + "T00:00:00");

                            if (!isNaN(taskStartDate.getTime()) && !isNaN(projDate.getTime())) {
                                // Ajustar horas a las 00:00:00 para cálculos precisos
                                taskStartDate.setHours(0, 0, 0, 0);
                                projDate.setHours(0, 0, 0, 0);
                                const diffTimeStart = taskStartDate.getTime() - projDate.getTime();
                                startDay = Math.max(0, Math.floor(diffTimeStart / (1000 * 60 * 60 * 24)));

                                if (cols[5]) {
                                    const taskDueDate = new Date(cols[5]);
                                    if (!isNaN(taskDueDate.getTime())) {
                                        taskDueDate.setHours(0, 0, 0, 0);
                                        const diffTimeEnd = taskDueDate.getTime() - taskStartDate.getTime();
                                        // La duración mínima es 1 día (si termina el mismo día que empieza)
                                        // Sumamos +1 porque GANTT usa duracion inclusiva (ej: empiza el 2, termina el 2 = 1 dia)
                                        durationDays = Math.max(1, Math.floor(diffTimeEnd / (1000 * 60 * 60 * 24)) + 1);
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Error calculando fecha para tarea", cols[0], e);
                        }
                    }

                    // Calcular horas (Planned Hours) logica opcional si existe cols[8]
                    let durationHours = 0;
                    let durationFromHours = 1;
                    if (cols[8]) {
                        const planned = parseFloat(cols[8]) || 0;
                        if (planned > 0) {
                            durationFromHours = Math.max(1, Math.floor(planned / 8));
                            durationHours = Math.round(planned % 8);
                        }
                    }

                    // Si calculamos las fechas correctas, las favorecemos por encima de las horas estimadas.
                    const finalDuration = cols[5] ? durationDays : durationFromHours;

                    tasks.push({
                        id: cols[0],
                        title: cols[3].substring(0, 40).toUpperCase(),
                        description: cols[3],
                        type: (cols[6] === "A&P" ? "AP" : (cols[6] || "AP")) as Task['type'],
                        start: startDay, // Empieza en 0-index
                        startHour: 8,
                        duration: finalDuration,
                        durationHours: durationHours,
                        progress: 0,
                        project: projectName || "IMPORTADO",
                        dependencies: []
                    });
                }
            });

            if (projectName || tasks.length > 0) {
                const finalProjectName = projectName || `PROJ-${Date.now()}`;
                if (activeProject === 'ALL') {
                    onAddProject({
                        name: finalProjectName,
                        customer: customer || "CLIENTE_DESCONOCIDO",
                        ac: ac || "PENDIENTE",
                        model: model,
                        msn: msn,
                        wo: wo || "WO_0000",
                        lp: lp,
                        pm: pm,
                        startDate: projectStartDateStr,
                        intervalDays: interval
                    });
                }
                onAddTasks(tasks.map(t => ({ ...t, project: finalProjectName })));
                alert(`IMPORTACIÓN EXITOSA:\nProyecto: ${finalProjectName}\nMetadatos: ${customer} | ${ac} | ${wo}\nTareas cargadas o actualizadas: ${tasks.length}`);
            }
        };
        reader.readAsText(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'intervalDays' ? parseInt(value) || 0 : value
        }));
    };

    const handleAdd = () => {
        if (formData.name.trim() && formData.customer.trim()) {
            onAddProject({
                ...formData,
                name: formData.name.trim().toUpperCase()
            });
            setIsEditing(false);
            // Reset form
            setFormData({
                name: '',
                customer: '',
                ac: '',
                wo: '',
                startDate: new Date().toISOString().split('T')[0],
                intervalDays: 45
            });
        }
    };

    const handleEditClick = (proj: Project) => {
        setFormData(proj);
        setIsEditing(true);
        // Scroll form into view if needed
        document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-80 z-50 hud-glass border-l border-cyan-500/30 flex flex-col animate-slide-in shadow-2xl">
            <div className="p-4 border-b border-cyan-500/30 bg-cyan-500/10 flex justify-between items-center">
                <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Folder className="w-4 h-4" /> GESTIÓN OPERATIVA
                </h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Cerrar Panel"
                    aria-label="Cerrar Panel de Control"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                {/* Add/Edit Project Form */}
                <section id="admin-form" className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-cyan-500/30 ring-1 ring-cyan-500/10">
                    <h3 className="text-[10px] text-cyan-500 uppercase font-black mb-2 flex items-center gap-2">
                        {isEditing ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {isEditing ? 'EDITAR PROYECTO' : 'NUEVO PROYECTO'}
                    </h3>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="customer-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">CUSTOMER (OPERADOR)</label>
                                <div className="relative">
                                    <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="customer-input"
                                        name="customer"
                                        value={formData.customer}
                                        onChange={handleChange}
                                        placeholder="ATLAS AIR..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="pm-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">PM (PROJECT MANAGER)</label>
                                <div className="relative">
                                    <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="pm-input"
                                        name="pm"
                                        value={formData.pm || ''}
                                        onChange={handleChange}
                                        placeholder="RICARDO..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="ac-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">A/C (AIRCRAFT)</label>
                                <div className="relative">
                                    <Plane className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="ac-input"
                                        name="ac"
                                        value={formData.ac}
                                        onChange={handleChange}
                                        placeholder="N859AU..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="model-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">AIRCRAFT MODEL</label>
                                <div className="relative">
                                    <Plane className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="model-input"
                                        name="model"
                                        value={formData.model || ''}
                                        onChange={handleChange}
                                        placeholder="B737-800..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label htmlFor="msn-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">MSN (SERIAL)</label>
                                <div className="relative">
                                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="msn-input"
                                        name="msn"
                                        value={formData.msn || ''}
                                        onChange={handleChange}
                                        placeholder="345..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="wo-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">W/O (WORK ORDER)</label>
                                <div className="relative">
                                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="wo-input"
                                        name="wo"
                                        value={formData.wo}
                                        onChange={handleChange}
                                        placeholder="WO-2025..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="lp-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">LP# (LINE PROD)</label>
                                <div className="relative">
                                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="lp-input"
                                        name="lp"
                                        value={formData.lp || ''}
                                        onChange={handleChange}
                                        placeholder="1..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="project-id" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">IDENTIFICADOR INTERNO (UNICO)</label>
                            <input
                                id="project-id"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                readOnly={isEditing}
                                placeholder="P-2025-FLIGHT-01..."
                                className={`w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-3 text-[10px] text-white focus:border-cyan-500 outline-none font-bold ${isEditing ? 'opacity-50' : ''}`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="date-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">START WORK DATE</label>
                                <div className="relative">
                                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="date-input"
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="interval-input" className="text-[8px] text-slate-500 uppercase font-black mb-1 block">INTERVALO (DÍAS)</label>
                                <div className="relative">
                                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                    <input
                                        id="interval-input"
                                        type="number"
                                        name="intervalDays"
                                        value={formData.intervalDays}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-7 pr-2 text-[10px] text-white focus:border-cyan-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAdd}
                            className={`w-full mt-2 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded transition-all shadow-lg flex items-center justify-center gap-2 ${isEditing ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20'}`}
                        >
                            {isEditing ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {isEditing ? 'GUARDAR_CAMBIOS' : 'CREAR_PROYECTO_PLANIFICADO'}
                        </button>

                        {isEditing && (
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData({ name: '', customer: '', ac: '', wo: '', startDate: new Date().toISOString().split('T')[0], intervalDays: 45 });
                                }}
                                className="w-full mt-1 py-1 text-slate-500 text-[8px] font-black uppercase hover:text-white transition-colors"
                            >
                                CANCELAR EDICIÓN
                            </button>
                        )}
                    </div>

                    <div className="pt-3 border-t border-white/5">
                        <label className="text-[8px] text-slate-600 font-bold uppercase mb-2 block text-center">
                            {activeProject !== 'ALL' ? `IMPORTAR A: ${activeProject}` : 'IMPORTAR NUEVO PROYECTO'}
                        </label>
                        <input
                            type="file"
                            id="csv-import"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                            title="Seleccionar archivo CSV para importar tareas"
                        />
                        <button
                            onClick={() => document.getElementById('csv-import')?.click()}
                            className="w-full py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-emerald-600/40 transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.1)]"
                        >
                            <Folder className="w-3 h-3" /> CARGAR_.CSV
                        </button>
                    </div>
                </section>

                {/* Project List */}
                <section>
                    <label className="text-[10px] text-slate-500 uppercase font-black mb-3 block border-b border-slate-800 pb-1">AIRCRAFT EN MANTENIMIENTO</label>
                    <div className="space-y-2">
                        {Object.keys(projects).length === 0 && (
                            <p className="text-[10px] text-slate-600 italic text-center py-4">SISTEMA VACÍO</p>
                        )}
                        {Object.values(projects).map(proj => (
                            <div
                                key={proj.name}
                                className="p-3 rounded bg-slate-900 border border-white/5 group hover:border-cyan-500/30 transition-all relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Plane className="w-3 h-3 text-cyan-500" />
                                        <span className="text-[10px] text-white font-black">{proj.customer}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditClick(proj)}
                                            className="p-1 text-cyan-500 hover:bg-cyan-500/20 rounded"
                                            title="Editar Proyecto"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteProject(proj.name)}
                                            className="p-1 text-red-500 hover:bg-red-500/20 rounded"
                                            title={`Eliminar Proyecto ${proj.name}`}
                                            aria-label={`Eliminar Proyecto ${proj.name}`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 text-[8px] font-bold uppercase">
                                    <div className="text-slate-500">CLIENTE:</div>
                                    <div className="text-slate-300 truncate text-right">{proj.customer}</div>
                                    <div className="text-slate-500">A/C :</div>
                                    <div className="text-slate-300 text-right">{proj.ac}</div>
                                    <div className="text-slate-500">W/O :</div>
                                    <div className="text-slate-300 text-right">{proj.wo}</div>
                                    <div className="text-slate-500">START:</div>
                                    <div className="text-slate-300 text-right">{proj.startDate}</div>
                                    <div className="text-slate-500">INTERVALO:</div>
                                    <div className="text-cyan-500 text-right">{proj.intervalDays} DÍAS</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminPanel;
