import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Info, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
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
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (group: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

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

    // Calculate grouped and sorted rows directly matching the user requirements
    const renderableRows = useMemo(() => {
        const groups = new Map<string, Task[]>();
        const independents: Task[] = [];

        tasks.forEach(t => {
            const g = (t.group || '').trim();
            if (g) {
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(t);
            } else {
                independents.push(t);
            }
        });

        type GroupRow = { isGroup: true, id: string, name: string, start: number, duration: number, progress: number, tasks: Task[] };
        type TaskRow = { isGroup: false, start: number, task: Task };
        type CombinedRow = GroupRow | TaskRow;
        type RenderableRow =
            | { type: 'GROUP_HEADER', data: GroupRow, isChild?: never }
            | { type: 'TASK', data: Task, isChild: boolean };

        const rows: RenderableRow[] = [];
        const processedGroups: GroupRow[] = Array.from(groups.entries()).map(([gName, gTasks]) => {
            gTasks.sort((a, b) => a.start - b.start);
            const minStart = Math.min(...gTasks.map(t => t.start));
            const maxEnd = Math.max(...gTasks.map(t => t.start + t.duration));
            const totalProgress = gTasks.reduce((acc, t) => acc + t.progress, 0) / gTasks.length;

            return {
                isGroup: true,
                id: `group-${gName}`,
                name: gName,
                start: minStart,
                duration: maxEnd - minStart,
                progress: totalProgress,
                tasks: gTasks
            };
        });

        // 3. Combine groups and independents, sort chronologically
        const combined: CombinedRow[] = [
            ...processedGroups,
            ...independents.map(t => ({ isGroup: false as const, start: t.start, task: t }))
        ];

        combined.sort((a, b) => a.start - b.start);

        // 4. Flatten based on collapse state
        combined.forEach(item => {
            if (item.isGroup) {
                const groupItem = item as GroupRow;
                rows.push({ type: 'GROUP_HEADER', data: groupItem });
                if (!collapsedGroups.has(groupItem.name)) {
                    groupItem.tasks.forEach((t: Task) => {
                        rows.push({ type: 'TASK', data: t, isChild: true });
                    });
                }
            } else {
                const taskItem = item as TaskRow;
                rows.push({ type: 'TASK', data: taskItem.task, isChild: false });
            }
        });

        return rows;
    }, [tasks, collapsedGroups]);

    const visibleRows = useMemo(() => {
        const start = Math.max(0, Math.floor((scrollTop - 56) / ROW_HEIGHT) - BUFFER);
        const end = Math.min(renderableRows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);

        return renderableRows.slice(start, end).map((row, index) => ({
            row,
            displayIndex: start + index
        }));
    }, [renderableRows, scrollTop, containerHeight]);

    const totalHeight = renderableRows.length * ROW_HEIGHT + 56;

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
                    {visibleRows.map((vRow) => {
                        const { row, displayIndex } = vRow;
                        const topPos = displayIndex * ROW_HEIGHT;

                        if (row.type === 'GROUP_HEADER') {
                            const group = row.data;
                            const startPos = (group.start - 1) * DAY_WIDTH;
                            const widthPos = group.duration * DAY_WIDTH;
                            const isCollapsed = collapsedGroups.has(group.name);

                            return (
                                <div
                                    key={group.id}
                                    className="absolute left-0 w-full h-[48px] border-b border-white/5 z-20 group transition-all"
                                    style={{ top: `${topPos}px` }}
                                >
                                    <div
                                        className="absolute top-2 h-8 rounded border flex items-center px-2 cursor-pointer transition-all hover:brightness-110 z-20"
                                        style={{
                                            left: startPos,
                                            width: Math.max(10, widthPos),
                                            backgroundColor: '#1e293b', // slate-800
                                            borderColor: 'rgba(255,255,255,0.1)',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleGroup(group.name);
                                        }}
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-cyan-600/30 z-0 pointer-events-none transition-all duration-500 rounded-l"
                                            style={{ width: `${group.progress}%` }}
                                        />
                                        <div className="z-10 flex items-center gap-1.5 w-full">
                                            {isCollapsed ? <ChevronRight className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />}
                                            <span className="truncate text-white font-black text-[10px] tracking-widest drop-shadow-md">
                                                ★ {group.name}
                                            </span>
                                            <span className="ml-auto text-[9px] font-bold text-cyan-400">{Math.round(group.progress)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Normal Task Rendering
                        const task = row.data as Task;
                        const startPos = (task.start - 1) * DAY_WIDTH;
                        const widthPos = task.duration * DAY_WIDTH;
                        const isWaitingParts = task.dependencies.includes('WAITING_PARTS');

                        return (
                            <div
                                key={task.id}
                                className={`absolute left-0 w-full h-[48px] border-b border-white/5 group transition-all hover:bg-white/[0.02] ${hoveredTask === task.id ? 'z-50' : 'z-0'}`}
                                style={{ top: `${topPos}px` }}
                                onMouseEnter={() => setHoveredTask(task.id)}
                                onMouseLeave={() => setHoveredTask(null)}
                            >
                                <div
                                    className={`absolute top-2 h-8 rounded border flex items-center px-2 font-black text-[10px] cursor-pointer transition-all hover:scale-[1.01] active:scale-95 z-10 overflow-hidden ${row.isChild ? 'opacity-90' : ''}`}
                                    style={{
                                        left: startPos,
                                        width: Math.max(10, widthPos),
                                        backgroundColor: getTaskColor(task.type, task.progress),
                                        borderColor: task.progress === 100 ? '#4ade80' : isWaitingParts ? '#f97316' : 'rgba(255,255,255,0.2)',
                                        boxShadow: task.progress === 100 ? '0 0 15px rgba(74, 222, 128, 0.2)' : isWaitingParts ? '0 0 10px rgba(249, 115, 22, 0.4)' : '0 0 10px rgba(0,0,0,0.3)',
                                        backgroundSize: isWaitingParts ? '20px 20px' : 'none',
                                        backgroundImage: isWaitingParts ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.2) 0, rgba(0,0,0,0.2) 10px, transparent 10px, transparent 20px)' : 'none'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(task);
                                    }}
                                >
                                    {/* Progress Bar with solid green color #15803d instead of white/10 */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 z-0 pointer-events-none transition-all duration-500"
                                        style={{ width: `${task.progress}%`, backgroundColor: 'rgba(21, 128, 61, 0.75)' }} // Stronger visible progress
                                    />

                                    <div className="z-10 flex items-center gap-1.5 w-full relative">
                                        {row.isChild && <div className="w-1 h-1 rounded-full bg-white/50 flex-none" />}
                                        {isWaitingParts && (
                                            <span title="Esperando Partes" className="flex-none">
                                                <AlertTriangle className="w-3 h-3 text-orange-400 animate-pulse" />
                                            </span>
                                        )}
                                        <span className="truncate text-white drop-shadow-md">
                                            {task.progress === 100 && '✓ '} {task.title}
                                        </span>
                                    </div>

                                    {/* Tooltip táctico */}
                                    {hoveredTask === task.id && task.description && (
                                        <div className="absolute top-10 left-0 w-64 p-3 bg-slate-900 border border-cyan-500/50 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Info className="w-3 h-3 text-cyan-400" />
                                                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">Detalle Operativo</span>
                                            </div>
                                            <p className="text-[10px] text-slate-300 font-bold leading-relaxed whitespace-pre-wrap">
                                                {task.description}
                                            </p>
                                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-500 uppercase font-black">
                                                <span>{task.type} DEP {row.isChild ? `| ZONA: ${task.group}` : ''}</span>
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
