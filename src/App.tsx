import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Crosshair,
  Settings,
  Printer,
  Activity,
  Layers,
  Plus,
  Search,
  Cloud,
  CloudOff,
  Users,
} from 'lucide-react';
import type { Task, AppState, Project } from './types';
import { loadState, saveState, recalculateTaskDates, generateStressData } from './engine';
import {
  loadStateFromCloud,
  saveProjectToCloud,
  deleteProjectFromCloud,
  saveTaskToCloud,
  deleteTaskFromCloud,
  saveAllTasksToCloud,
} from './db';
import { supabase } from './supabase';
import Sidebar from './components/Sidebar';
import GanttContainer from './components/GanttContainer';
import TaskModal from './components/TaskModal';
import AdminPanel from './components/AdminPanel';
import PrintReport from './components/PrintReport';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
type SyncStatus = 'loading' | 'online' | 'offline';

// ──────────────────────────────────────────────────────────────
// APP
// ──────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'ALL' | 'PENDING' | 'TODAY'>('ALL');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [onlineUsers, setOnlineUsers] = useState(1);

  // Track if initial cloud load has finished — avoid redundant saves on first render
  const cloudReady = useRef(false);

  // ────────────────────────────────────────────────────────────
  // INITIAL CLOUD LOAD (with localStorage fallback)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const cloudState = await loadStateFromCloud();
      if (cloudState && Object.keys(cloudState.projects).length > 0) {
        setState(cloudState);
        saveState(cloudState); // sync to localStorage as backup
        setSyncStatus('online');
      } else {
        // Offline or empty DB → use localStorage seed and push to cloud
        const local = loadState();
        setState(local);
        const hasProjects = Object.keys(local.projects).length > 0;
        if (hasProjects) {
          for (const proj of Object.values(local.projects)) {
            await saveProjectToCloud(proj);
          }
          await saveAllTasksToCloud(local.tasks);
          setSyncStatus('online');
        } else {
          setSyncStatus('offline');
        }
      }
      cloudReady.current = true;
    };
    init();
  }, []);

  // ────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('strategic-ops-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const cloudState = await loadStateFromCloud();
        if (cloudState) {
          setState(prev => ({
            ...cloudState,
            activeProject: prev.activeProject, // keep current view
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, async () => {
        const cloudState = await loadStateFromCloud();
        if (cloudState) {
          setState(prev => ({
            ...cloudState,
            activeProject: prev.activeProject,
          }));
        }
      })
      // Presence: track connected users
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('online');
          await channel.track({ user: `OPS_${Math.random().toString(36).substr(2, 4).toUpperCase()}`, online_at: new Date().toISOString() });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('offline');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ────────────────────────────────────────────────────────────
  // LOCAL STORAGE BACKUP (persists every change)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cloudReady.current) {
      saveState(state);
    }
  }, [state]);

  // ────────────────────────────────────────────────────────────
  // COMPUTED
  // ────────────────────────────────────────────────────────────
  const currentStartDate = useMemo(() => {
    if (state.activeProject === 'ALL') {
      const dates = Object.values(state.projects).map(p => new Date(p.startDate).getTime());
      return dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : new Date().toISOString();
    }
    return state.projects[state.activeProject]?.startDate || new Date().toISOString();
  }, [state.activeProject, state.projects]);

  const projects = useMemo(() => Object.keys(state.projects), [state.projects]);

  const filteredTasks = useMemo(() => {
    let tasks = state.activeProject === 'ALL'
      ? state.tasks
      : state.tasks.filter(t => t.project === state.activeProject);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.project.toLowerCase().includes(q)
      );
    }

    if (viewFilter === 'PENDING') {
      tasks = tasks.filter(t => t.progress < 100);
    } else if (viewFilter === 'TODAY') {
      const start = new Date(currentStartDate);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24));
      tasks = tasks.filter(t => t.start <= diffDays && (t.start + t.duration) >= diffDays);
    }

    return tasks;
  }, [state.tasks, state.activeProject, searchQuery, viewFilter, currentStartDate]);

  // ────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────
  const handleSaveTask = useCallback(async (task: Task) => {
    setState(prev => {
      const exists = prev.tasks.find(t => t.id === task.id);
      const newTasks = exists
        ? prev.tasks.map(t => t.id === task.id ? task : t)
        : [...prev.tasks, task];
      return { ...prev, tasks: recalculateTaskDates(newTasks) };
    });
    await saveTaskToCloud(task);
    setEditingTask(null);
    setIsNewTaskModalOpen(false);
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    await deleteTaskFromCloud(id);
    setEditingTask(null);
  }, []);

  const handleAddProject = useCallback(async (project: Project) => {
    setState(prev => ({
      ...prev,
      projects: { ...prev.projects, [project.name]: project }
    }));
    await saveProjectToCloud(project);
  }, []);

  const handleDeleteProject = useCallback(async (name: string) => {
    if (confirm(`¿Eliminar unidad ${name} y todas sus tareas?`)) {
      setState(prev => {
        const rest = { ...prev.projects };
        delete rest[name];
        return {
          ...prev,
          projects: rest,
          tasks: prev.tasks.filter(t => t.project !== name),
          activeProject: prev.activeProject === name ? 'ALL' : prev.activeProject
        };
      });
      await deleteProjectFromCloud(name);
    }
  }, []);

  const triggerStressTest = () => {
    const stressTasks = generateStressData(1000);
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks.filter(t => t.project !== 'STRESS-UNIT'), ...stressTasks],
      projects: {
        ...prev.projects,
        'STRESS-UNIT': {
          name: 'STRESS-UNIT',
          customer: 'INTERNAL',
          ac: 'BENCHMARK',
          wo: 'WO-STRESS',
          startDate: new Date().toISOString().split('T')[0],
          intervalDays: 100
        }
      },
      activeProject: 'STRESS-UNIT'
    }));
  };

  // Silence unused warning from triggerStressTest — it's still available via dev console
  void triggerStressTest;

  // ────────────────────────────────────────────────────────────
  // SYNC STATUS INDICATOR STYLES
  // ────────────────────────────────────────────────────────────
  const syncColor = syncStatus === 'online' ? 'text-green-400' : syncStatus === 'loading' ? 'text-yellow-400' : 'text-red-500';
  const syncLabel = syncStatus === 'online' ? 'CLOUD_SYNC' : syncStatus === 'loading' ? 'CONNECTING...' : 'OFFLINE_MODE';

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full bg-bg-main overflow-hidden text-slate-100 font-mono selection:bg-cyan-500/30">
      {/* Scanning Line Animation Layer */}
      <div className="scanning-line print:hidden"></div>

      {/* Sidebar - Tactical Navigation */}
      <Sidebar
        activeProject={state.activeProject}
        setActiveProject={(p: string) => setState(prev => ({ ...prev, activeProject: p }))}
        projects={state.projects}
        className="print:hidden"
      />

      {/* Main Command Area */}
      <main className="flex-1 flex flex-col relative min-w-0 print:hidden">

        <header className="h-16 border-b border-cyan-500/30 flex items-center justify-between px-4 sm:px-6 bg-slate-950/50 backdrop-blur-md z-30 flex-none print:hidden overflow-x-auto whitespace-nowrap custom-scrollbar">
          <div className="flex items-center gap-4 flex-none">
            <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center animate-pulse">
              <Crosshair className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.2em] text-cyan-500 uppercase">Strategic_Interior_Ops_v11</h1>
              <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 uppercase">
                <span className="flex items-center gap-1"><Activity className="w-2 h-2 text-green-500" /> Tactical_Flow</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span className="text-cyan-700">X-TREME_AVIATION_CORP</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-sm mx-4 sm:mx-10 relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="BUSCAR_TAREA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/40 border border-cyan-500/20 rounded-full py-1.5 pl-9 pr-4 text-[10px] text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-slate-700 font-bold"
            />
          </div>

          <div className="flex items-center gap-3 flex-none">
            {/* Cloud Sync Indicator */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded border text-[8px] font-black uppercase tracking-widest transition-all ${syncStatus === 'online'
              ? 'border-green-500/30 bg-green-500/5 text-green-400'
              : syncStatus === 'loading'
                ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 animate-pulse'
                : 'border-red-500/30 bg-red-500/5 text-red-400'
              }`}>
              {syncStatus === 'online'
                ? <Cloud className="w-3 h-3" />
                : <CloudOff className="w-3 h-3" />
              }
              <span className={syncColor}>{syncLabel}</span>
              {syncStatus === 'online' && (
                <span className="flex items-center gap-1 ml-1 pl-1 border-l border-green-500/20">
                  <Users className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="text-cyan-400">{onlineUsers}</span>
                </span>
              )}
            </div>

            {/* View Filter Buttons */}
            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5 mr-4 hidden md:flex">
              <button
                onClick={() => setViewFilter('ALL')}
                className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${viewFilter === 'ALL' ? 'bg-cyan-500 text-black shadow-[0_0_10px_cyan]' : 'text-slate-500 hover:text-white'}`}
              >
                GLOBAL
              </button>
              <button
                onClick={() => setViewFilter('PENDING')}
                className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${viewFilter === 'PENDING' ? 'bg-cyan-500 text-black shadow-[0_0_10px_cyan]' : 'text-slate-500 hover:text-white'}`}
              >
                PENDIENTES
              </button>
              <button
                onClick={() => setViewFilter('TODAY')}
                className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${viewFilter === 'TODAY' ? 'bg-cyan-500 text-black shadow-[0_0_10px_cyan]' : 'text-slate-500 hover:text-white'}`}
              >
                HOY
              </button>
            </div>
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/40 rounded text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:bg-cyan-600/40 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Nueva_Tarea
            </button>
            <div className="h-6 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
              title="IMPRIMIR REPORTE"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAdminOpen(!isAdminOpen)}
              className={`p-2 transition-colors ${isAdminOpen ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'}`}
              title="Panel de Control de Proyectos"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* HUD Sub-header */}
        <div className="h-8 flex-none bg-slate-900/30 border-b border-white/5 flex items-center px-4 sm:px-6 justify-between overflow-x-auto custom-scrollbar print:hidden">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-cyan-500/50" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">A/C Sector:</span>
              <span className="text-[9px] font-black text-white uppercase">{state.activeProject === 'ALL' ? 'FLOTA ACTIVA' : state.activeProject}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-500/50" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Tasks:</span>
              <span className="text-[9px] font-black text-white uppercase">{filteredTasks.length} TKS_ARMED</span>
            </div>
          </div>
          <div className="text-[8px] font-bold text-slate-600 animate-pulse hidden sm:block">
            // RAW_DATA_STREAMS_ACTIVE // SECURE_UPLINK_ESTABLISHED
          </div>
        </div>

        {/* Gantt Visualization Area */}
        <GanttContainer
          tasks={filteredTasks}
          project={state.projects[state.activeProject] || { name: 'ALL', customer: '-', ac: '-', wo: '-', startDate: currentStartDate, intervalDays: 80 }}
          projectStartDate={currentStartDate}
          onEditTask={(task) => setEditingTask(task)}
        />

        {/* Loading Overlay */}
        {syncStatus === 'loading' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"></div>
              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">ESTABLISHING UPLINK...</p>
              <p className="text-[8px] text-slate-500 uppercase">Conectando a XTREME-OPS-V11 Cloud</p>
            </div>
          </div>
        )}

        {/* Modal Overlays */}
        {(editingTask || isNewTaskModalOpen) && (
          <TaskModal
            task={editingTask}
            tasks={state.tasks}
            projects={projects}
            activeProject={state.activeProject}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
            onClose={() => {
              setEditingTask(null);
              setIsNewTaskModalOpen(false);
            }}
          />
        )}

        {isAdminOpen && (
          <AdminPanel
            projects={state.projects}
            activeProject={state.activeProject}
            onAddProject={handleAddProject}
            onAddTasks={async (newTasks) => {
              setState(prev => ({
                ...prev,
                tasks: recalculateTaskDates([...prev.tasks, ...newTasks])
              }));
              await saveAllTasksToCloud(newTasks);
            }}
            onDeleteProject={handleDeleteProject}
            onClose={() => setIsAdminOpen(false)}
          />
        )}

      </main>

      {/* Print Only Report */}
      <div className="print-report-container hidden print:block">
        <PrintReport
          tasks={filteredTasks}
          projects={state.projects}
          activeProject={state.activeProject}
          viewFilter={viewFilter}
        />
      </div>
    </div>
  );
};

export default App;
