import { supabase } from './supabase';
import type { Task, Project, AppState } from './types';

// ─────────────────────────────────────────────
// LOAD
// ─────────────────────────────────────────────

export const loadStateFromCloud = async (): Promise<AppState | null> => {
    try {
        const [{ data: projectsData, error: pe }, { data: tasksData, error: te }] = await Promise.all([
            supabase.from('projects').select('*'),
            supabase.from('tasks').select('*'),
        ]);

        if (pe || te) {
            console.warn('[CLOUD] Error cargando desde Supabase:', pe || te);
            return null;
        }

        const projects: Record<string, Project> = {};
        (projectsData || []).forEach((p) => {
            projects[p.name] = {
                name: p.name,
                customer: p.customer,
                ac: p.ac,
                model: p.model,
                msn: p.msn,
                wo: p.wo,
                lp: p.lp,
                pm: p.pm,
                startDate: p.start_date,
                intervalDays: p.interval_days,
            };
        });

        const tasks: Task[] = (tasksData || []).map((t) => ({
            id: t.id,
            itemNumber: t.item_number || t.id.split('-').pop() || '',
            title: t.title,
            description: t.description ?? '',
            type: t.type,
            start: t.start,
            duration: t.duration,
            progress: t.progress,
            project: t.project,
            dependencies: t.dependencies ?? [],
        }));

        const activeProject = Object.keys(projects)[0] || 'ALL';

        return { projects, tasks, activeProject };
    } catch (err) {
        console.warn('[CLOUD] Excepción al cargar:', err);
        return null;
    }
};

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────

export const saveProjectToCloud = async (project: Project) => {
    const { error } = await supabase.from('projects').upsert({
        name: project.name,
        customer: project.customer,
        ac: project.ac,
        model: project.model,
        msn: project.msn,
        wo: project.wo,
        lp: project.lp,
        pm: project.pm,
        start_date: project.startDate,
        interval_days: project.intervalDays,
    });
    if (error) console.error('[CLOUD] Error guardando proyecto:', error);
};

export const deleteProjectFromCloud = async (name: string) => {
    const { error } = await supabase.from('projects').delete().eq('name', name);
    if (error) console.error('[CLOUD] Error eliminando proyecto:', error);
};

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────

export const saveTaskToCloud = async (task: Task) => {
    const { error } = await supabase.from('tasks').upsert({
        id: task.id,
        item_number: task.itemNumber,
        title: task.title,
        description: task.description,
        type: task.type,
        start: task.start,
        duration: task.duration,
        progress: task.progress,
        project: task.project,
        dependencies: task.dependencies,
    });
    if (error) console.error('[CLOUD] Error guardando tarea:', error);
};

export const deleteTaskFromCloud = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('[CLOUD] Error eliminando tarea:', error);
};

export const saveAllTasksToCloud = async (tasks: Task[]) => {
    if (tasks.length === 0) return;
    const rows = tasks.map(task => ({
        id: task.id,
        item_number: task.itemNumber,
        title: task.title,
        description: task.description,
        type: task.type,
        start: task.start,
        duration: task.duration,
        progress: task.progress,
        project: task.project,
        dependencies: task.dependencies,
    }));
    const { error } = await supabase.from('tasks').upsert(rows);
    if (error) console.error('[CLOUD] Error en upsert masivo de tareas:', error);
};
