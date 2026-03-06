import React, { useState } from 'react';
import { X, Save, Trash2, Link as LinkIcon, Info } from 'lucide-react';
import type { Task } from '../types';

interface TaskModalProps {
    task: Task | null;
    tasks: Task[];
    projects: string[];
    activeProject: string;
    onSave: (task: Task) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
    task,
    tasks,
    projects,
    activeProject,
    onSave,
    onDelete,
    onClose
}) => {
    const [formData, setFormData] = useState<Task>(() => {
        if (task) {
            // Migrar tareas antiguas sin el campo group
            return {
                ...task,
                group: task.group || ''
            };
        }
        return {
            id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemNumber: '',
            title: '',
            description: '',
            type: 'AP',
            start: 1,
            duration: 1,
            progress: 0,
            project: activeProject !== 'ALL' ? activeProject : (projects[0] || 'DEFAULT'),
            group: '',
            dependencies: []
        };
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Validación de enteros para campos numéricos
        if (['start', 'duration', 'progress'].includes(name)) {
            const num = Math.floor(Number(value));
            const finalVal = name === 'start' ? Math.max(1, num) : Math.max(0, num);
            setFormData(prev => ({ ...prev, [name]: isNaN(num) ? (name === 'start' ? 1 : 0) : finalVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleToggleDependency = (depId: string) => {
        setFormData(prev => {
            const deps = prev.dependencies.includes(depId)
                ? prev.dependencies.filter(id => id !== depId)
                : [...prev.dependencies, depId];
            return { ...prev, dependencies: deps };
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="w-full max-w-lg hud-glass rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-cyan-500/10">
                    <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> {task ? 'EDITAR_TAREA' : 'NUEVA_TAREA'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">ITEM#</label>
                            <input
                                name="itemNumber"
                                value={formData.itemNumber || ''}
                                onChange={handleChange}
                                placeholder="EJ. 25-030..."
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">DISCREPANCY</label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Ej. INSPECCIÓN TÉCNICA..."
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Descripción Larga (para Tooltip) */}
                    <div>
                        <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block flex items-center gap-2">
                            DESCRIPCIÓN DE LA TAREA <Info className="w-2.5 h-2.5 opacity-50" />
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="DETALLES COMPLETOS DE LA TAREA PARA EL REPORTE..."
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">SKILL</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="AP">AIRFRAME</option>
                                <option value="INT">INTERIOR</option>
                                <option value="AVI">AVIONICS</option>
                                <option value="SM">SHEET METAL</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block text-slate-400">PROYECTO / AVIÓN</label>
                            <select
                                name="project"
                                disabled
                                value={formData.project}
                                onChange={handleChange}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-xs text-slate-500 outline-none cursor-not-allowed"
                            >
                                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">GRUPO / ZONA (Opcional)</label>
                        <input
                            name="group"
                            value={formData.group || ''}
                            onChange={handleChange}
                            placeholder="Ej. CABIN, EQUIPOS EMERGENCIA..."
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                        <div>
                            <label htmlFor="start-day" className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">Día Ini</label>
                            <input
                                id="start-day"
                                type="number"
                                name="start"
                                min="1"
                                value={formData.start}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="duration-days" className="text-[10px] text-cyan-500 uppercase font-black mb-1 block">Días Duración</label>
                            <input
                                id="duration-days"
                                type="number"
                                name="duration"
                                min="1"
                                value={formData.duration}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="progress-slider" className="text-[10px] text-cyan-500 uppercase font-black block">Avance de Tarea: {formData.progress}%</label>
                        </div>
                        <input
                            id="progress-slider"
                            type="range"
                            name="progress"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.progress}
                            onChange={handleChange}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-cyan-500 uppercase font-black mb-2 block border-t border-slate-800 pt-3 flex items-center justify-between">
                            <span>Dependencias Operativas (Cascada)</span>
                            <div className="flex items-center gap-2">
                                <label htmlFor="waiting-parts" className="text-orange-400 hover:text-orange-300 cursor-pointer flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/30 transition-colors">
                                    <input
                                        id="waiting-parts"
                                        type="checkbox"
                                        checked={formData.dependencies.includes('WAITING_PARTS')}
                                        onChange={() => handleToggleDependency('WAITING_PARTS')}
                                        className="accent-orange-500 cursor-pointer"
                                    />
                                    Esperando Partes
                                </label>
                            </div>
                        </label>
                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-2 mt-2">
                            {tasks.filter(t => t.id !== formData.id && t.project === formData.project).map(other => (
                                <button
                                    key={other.id}
                                    type="button"
                                    onClick={() => handleToggleDependency(other.id)}
                                    className={`w-full text-left p-2 rounded text-[10px] transition-all flex justify-between items-center ${formData.dependencies.includes(other.id)
                                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                                        : 'bg-slate-950/50 border border-white/5 text-slate-500 hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="truncate">{other.title}</span>
                                    {formData.dependencies.includes(other.id) && <Save className="w-3 h-3" />}
                                </button>
                            ))}
                            {tasks.filter(t => t.id !== formData.id && t.project === formData.project).length === 0 && (
                                <p className="text-[10px] text-slate-600 italic">No hay otras tareas en este proyecto.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950/80 border-t border-cyan-900/30 flex gap-2">
                    {task && (
                        <button
                            onClick={() => onDelete(task.id)}
                            className="flex-none p-2 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(8,145,178,0.2)]"
                    >
                        <Save className="w-4 h-4" /> {task ? 'ACTUALIZAR_TAREA' : 'AÑADIR_AL_TIMELINE'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
