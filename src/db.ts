import { supabase } from './supabase';
import type { Task, Project, AppState } from './types';

// Internal DB row shape for tasks (some columns optional for schema compatibility)
interface TaskRow {
    id: string;
    item_number: string;
    title: string;
    description: string;
    type: string;
    start: number;
    start_hour: number;
    duration: number;
    duration_hours: number;
    progress: number;
    project: string;
    dependencies: string[];
    project_group?: string;
    group?: string;
}

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

        const tasks: Task[] = (tasksData || []).map((t) => {
            // Sanitize corrupted / out-of-bounds values that would hide tasks off-screen
            const rawStart = typeof t.start === 'number' ? t.start : parseInt(t.start) || 1;
            const rawDuration = typeof t.duration === 'number' ? t.duration : parseInt(t.duration) || 1;
            const safeStart = rawStart > 500 || rawStart < 1 ? 1 : rawStart;   // Cap runaway dates
            const safeDuration = rawDuration < 1 ? 1 : rawDuration;

            return {
                id: String(t.id),
                itemNumber: t.item_number || String(t.id) || '',
                title: t.title || '(Sin título)',
                description: t.description ?? '',
                type: t.type || 'INT',
                start: safeStart,
                duration: safeDuration,
                progress: typeof t.progress === 'number' ? t.progress : 0,
                project: t.project,
                group: t.project_group || t.group || '',
                dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
            };
        });

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
    const payload: TaskRow = {
        id: task.id,
        item_number: task.itemNumber,
        title: task.title,
        description: task.description,
        type: task.type,
        start: task.start,
        start_hour: 8,
        duration: task.duration,
        duration_hours: 0,
        progress: task.progress,
        project: task.project,
        project_group: task.group || '',
        dependencies: task.dependencies,
    };

    let { error } = await supabase.from('tasks').upsert(payload);

    if (error && (error.message.includes('project_group') || error.message.includes('column'))) {
        delete payload.project_group;
        payload.group = task.group || '';
        const retryResult = await supabase.from('tasks').upsert(payload);
        error = retryResult.error;

        if (error && (error.message.includes('group') || error.message.includes('column'))) {
            delete payload.group;
            const finalResult = await supabase.from('tasks').upsert(payload);
            error = finalResult.error;
        }
    }

    if (error) {
        console.error('[CLOUD] Error guardando tarea:', error);
        alert(`[ ERROR NUBE ] No se guardó la tarea. \nSugerencia: Revisa que todos los campos sean válidos. Detalle del servidor: ${error.message}`);
    }
};

export const deleteTaskFromCloud = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('[CLOUD] Error eliminando tarea:', error);
};

export const saveAllTasksToCloud = async (tasks: Task[]) => {
    if (tasks.length === 0) return;
    let rows: TaskRow[] = tasks.map(task => ({
        id: task.id,
        item_number: task.itemNumber,
        title: task.title,
        description: task.description,
        type: task.type,
        start: task.start,
        start_hour: 8,
        duration: task.duration,
        duration_hours: 0,
        progress: task.progress,
        project: task.project,
        project_group: task.group || '',
        dependencies: task.dependencies,
    }));

    let { error } = await supabase.from('tasks').upsert(rows);

    if (error && (error.message.includes('project_group') || error.message.includes('column'))) {
        rows = rows.map(r => {
            const nr = { ...r, group: r.project_group };
            delete nr.project_group;
            return nr;
        });
        const retryResult = await supabase.from('tasks').upsert(rows);
        error = retryResult.error;

        if (error && (error.message.includes('group') || error.message.includes('column'))) {
            rows = rows.map(r => {
                const nr = { ...r };
                delete nr.group;
                return nr;
            });
            const finalResult = await supabase.from('tasks').upsert(rows);
            error = finalResult.error;
        }
    }

    if (error) {
        console.error('[CLOUD] Error en upsert masivo de tareas:', error);
        alert(`[ ERROR MASIVO NUBE ] No se pudieron guardar las tareas actualizadas. \nDetalle: ${error.message}`);
    }
};
