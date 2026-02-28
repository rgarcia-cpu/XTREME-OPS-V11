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

            if (activeProject === 'ALL') {
                alert("ATENCIÓN: Para importar tareas desde Excel, primero debes seleccionar un Proyecto/Avión específico en el menú lateral (Ej. ATI, ATLAS AIR, etc.).");
                return;
            }

            const tasks: Task[] = [];
            let headerFound = false;

            lines.forEach((line) => {
                const rawLine = line.trim();
                if (!rawLine) return; // Ignore empty lines

                const cols = rawLine.split(',').map(c => c.trim().replace(/"/g, ''));

                // Buscar encabezado y saltear si es necesario
                if (cols[0].toUpperCase().includes("ITEM#")) {
                    headerFound = true;
                    return;
                }

                // Si ya pasamos el encabezado y hay al menos 2 columnas
                if (headerFound && cols[0] && cols[1]) {
                    // EXPECTED COLUMNS:
                    // 0: ITEM# (id)
                    // 1: DISCREPANCY (title)
                    // 2: DESCRIPTION LARGA (description)
                    // 3: SKILL (type)
                    // 4: DIA INI (start)
                    // 5: DIA DURACION (duration)
                    // 6: PLANNED HOURS (No se usa directamente en la DB pero podría ser base duracion, aqui tomamos duration normal o usamos Planned/8)
                    // 7: ADD HOURS (durationHours)
                    // 8: AVANCE (progress)

                    const itemNum = cols[0];
                    const title = cols[1]?.substring(0, 40).toUpperCase() || "SIN TITULO";
                    const desc = cols[2] || cols[1];
                    const skillStr = cols[3]?.toUpperCase() === "A&P" ? "AP" : (cols[3]?.toUpperCase() || "AP");

                    const startDay = Math.max(0, parseInt(cols[4]) || 0);
                    const durationDays = Math.max(1, parseInt(cols[5]) || 1);

                    // Col 6 is Planned Hours (ignored for timeline calculation as we use DIA DURACION directly)
                    const addedHours = Math.max(0, parseFloat(cols[7]) || 0);
                    const progressVal = Math.max(0, Math.min(100, parseInt(cols[8]) || 0));

                    tasks.push({
                        id: `${activeProject}-${itemNum}`,
                        title: title,
                        description: desc,
                        type: skillStr as Task['type'],
                        start: startDay,
                        startHour: 8, // Fixed start hour since it was removed
                        duration: durationDays,
                        durationHours: addedHours,
                        progress: progressVal,
                        project: activeProject,
                        dependencies: []
                    });
                }
            });

            if (tasks.length > 0) {
                onAddTasks(tasks);
                alert(`IMPORTACIÓN EXITOSA:\nProyecto: ${activeProject}\nTareas cargadas o actualizadas: ${tasks.length}`);
            } else {
                alert("No se encontraron tareas válidas en el archivo CSV. Revisa el formato.");
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
