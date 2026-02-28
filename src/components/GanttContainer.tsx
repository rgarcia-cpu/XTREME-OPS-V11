import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { Task, Project } from '../types';

interface GanttProps {
    tasks: Task[];
    project: Project;
    projectStartDate: string;
    onEditTask: (task: Task) => void;
}

const DAY_WIDTH = 60;
const ROW_HEIGHT = 48;
const BUFFER = 5;

const GanttContainer: React.FC<GanttProps> = ({ tasks, project, projectStartDate, onEditTask }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [hoveredTask, setHoveredTask] = useState<string | null>(null);

    const intervalDays = project.intervalDays || 80;
    const gridWidth = intervalDays * DAY_WIDTH;

    // Calcular posición de "Hoy" (Línea Roja)
    const todayPos = useMemo(() => {
        const start = new Date(projectStartDate);
        const today = new Date();
        const diffTime = today.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays; // No redondeamos para que la posición sea exacta incluyendo horas transcurridas
    }, [projectStartDate]);

    // Centrar automáticamente en "Hoy" al cargar o cambiar de proyecto
    useEffect(() => {
        if (containerRef.current && todayPos > 0) {
            const scrollPos = (todayPos * DAY_WIDTH) - (containerRef.current.clientWidth / 2);
            containerRef.current.scrollLeft = Math.max(0, scrollPos);
        }
    }, [projectStartDate, todayPos]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const visibleTasks = useMemo(() => {
        const start = Math.max(0, Math.floor((scrollTop - 56) / ROW_HEIGHT) - BUFFER);
        const end = Math.min(tasks.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);

        return tasks.slice(start, end).map((task, index) => ({
            ...task,
            displayIndex: start + index
        }));
    }, [tasks, scrollTop, containerHeight]);

    const totalHeight = tasks.length * ROW_HEIGHT + 56;

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto custom-scrollbar relative bg-grid print:hidden"
        >
            <div className="relative" style={{ width: `${gridWidth}px`, height: `${totalHeight}px` }}>

                {/* Hoy (Red Line) */}
                <div
                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-30 pointer-events-none"
                    style={{ left: `${todayPos * DAY_WIDTH}px` }}
                >
                    <div className="bg-red-500 text-white text-[8px] font-black px-1 py-0.5 absolute top-14 -left-3 rounded-sm">HOY</div>
                </div>

                {/* Timeline Header */}
                <div
                    className="flex sticky top-0 left-0 z-40 bg-slate-950/90 border-b border-cyan-500/30 h-14 backdrop-blur-md"
                    style={{ width: `${gridWidth}px` }}
                >
                    {Array.from({ length: intervalDays }).map((_, i) => {
                        const isToday = Math.floor(todayPos) === i;
                        // Forzar una fecha fija a mediodía para evitar cualquier desfase de la zona horaria (como T00:00:00 vs T12:00:00)
                        const [year, month, day] = projectStartDate.split('T')[0].split('-');
                        const dayDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
                        dayDate.setDate(dayDate.getDate() + i);
                        const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                        const dayInitial = dayNames[dayDate.getDay()];

                        return (
                            <div
                                key={i}
                                className={`flex-none w-[60px] flex flex-col items-center justify-center border-r border-white/5 text-[10px] ${isToday ? 'bg-red-500/10' : ''}`}
                            >
                                <span className={`text-[9px] opacity-100 uppercase font-bold ${isToday ? 'text-red-400 font-black' : 'text-slate-400'}`}>
                                    {dayInitial}
                                </span>
                                <span className={`text-[12px] font-bold leading-none ${isToday ? 'text-red-500' : 'text-slate-300'}`}>{i + 1}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Task Grid Area */}
                <div className="relative">
                    {visibleTasks.map((task) => {
                        // Calcular posición exacta considerando horas
                        const startPos = (task.start * 24 + task.startHour) / 24 * DAY_WIDTH;
                        const widthPos = (task.duration * 24 + task.durationHours) / 24 * DAY_WIDTH;

                        return (
                            <div
                                key={task.id}
                                className={`absolute left-0 w-full h-[48px] border-b border-white/5 group transition-all hover:bg-white/[0.02] ${hoveredTask === task.id ? 'z-50' : 'z-0'}`}
                                style={{ top: `${task.displayIndex * ROW_HEIGHT}px` }}
                                onMouseEnter={() => setHoveredTask(task.id)}
                                onMouseLeave={() => setHoveredTask(null)}
                            >
                                <div
                                    className={`absolute top-2 h-8 rounded border flex items-center px-3 font-black text-[10px] cursor-pointer transition-all hover:scale-[1.01] active:scale-95 z-10`}
                                    style={{
                                        left: startPos,
                                        width: Math.max(10, widthPos),
                                        backgroundColor: getTaskColor(task.type, task.progress),
                                        borderColor: task.progress === 100 ? '#4ade80' : 'rgba(255,255,255,0.2)',
                                        boxShadow: task.progress === 100 ? '0 0 15px rgba(74, 222, 128, 0.2)' : '0 0 10px rgba(0,0,0,0.3)'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(task);
                                    }}
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-white/10 z-0 pointer-events-none transition-all duration-500"
                                        style={{ width: `${task.progress}%` }}
                                    />

                                    <span className="z-10 truncate text-white drop-shadow-md">
                                        {task.progress === 100 && '✓ '} {task.title}
                                    </span>

                                    {/* Tooltip táctico */}
                                    {hoveredTask === task.id && task.description && (
                                        <div className="absolute top-10 left-0 w-64 p-3 bg-slate-900 border border-cyan-500/50 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Info className="w-3 h-3 text-cyan-400" />
                                                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">Detalle Operativo</span>
                                            </div>
                                            <p className="text-[10px] text-slate-300 font-bold leading-relaxed">
                                                {task.description}
                                            </p>
                                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-500 uppercase font-black">
                                                <span>{task.type} DEP</span>
                                                <span className="text-cyan-500">{task.progress}% COMPLETO</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-400 animate-ping opacity-0 group-hover:opacity-100" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const getTaskColor = (type: string, progress: number) => {
    if (progress === 100) return '#15803d';

    const colors: Record<string, string> = {
        'INT': '#0891b2',
        'AVI': '#7c3aed',
        'AP': '#b91c1c',
        'SM': '#15803d'
    };
    return colors[type] || '#334155';
};

export default GanttContainer;
