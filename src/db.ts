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
    task_group?: string; // Use task_group as the canonical column name
}

// LocalStorage key for emergency group backup
const LOCAL_STORAGE_GROUP_KEY = 'task_groups_backup';

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

        // Load emergency group backup from localStorage
        let localStorageGroups: Record<string, string> = {};
        try {
            const storedGroups = localStorage.getItem(LOCAL_STORAGE_GROUP_KEY);
            if (storedGroups) {
                localStorageGroups = JSON.parse(storedGroups);
            }
        } catch (e) {
            console.warn('[CLOUD] Error parsing localStorage group backup:', e);
        }

        const tasks: Task[] = (tasksData || []).map((t) => {
            // Sanitize corrupted / out-of-bounds values that would hide tasks off-screen
            const rawStart = typeof t.start === 'number' ? t.start : parseInt(t.start) || 1;
            const rawDuration = typeof t.duration === 'number' ? t.duration : parseInt(t.duration) || 1;
            const safeStart = rawStart > 500 || rawStart < 1 ? 1 : rawStart;   // Cap runaway dates
            const safeDuration = rawDuration < 1 ? 1 : rawDuration;

            const taskId = String(t.id);
            let group = t.task_group || '';

            // If cloud data doesn't have group, try to merge from localStorage backup
            if (!group && localStorageGroups[taskId]) {
                group = localStorageGroups[taskId];
            }

            return {
                id: taskId,
                itemNumber: t.item_number || String(t.id) || '',
                title: t.title || '(Sin título)',
                description: t.description ?? '',
                type: t.type || 'INT',
                start: safeStart,
                duration: safeDuration,
                progress: typeof t.progress === 'number' ? t.progress : 0,
                project: t.project,
                group: group,
                dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
            };
        });

        // Clear localStorage backup after successful merge to prevent stale data
        if (Object.keys(localStorageGroups).length > 0) {
            localStorage.removeItem(LOCAL_STORAGE_GROUP_KEY);
        }

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
        task_group: task.group || '', // Use task_group
        dependencies: task.dependencies,
    };

    const { error } = await supabase.from('tasks').upsert(payload);

    if (error) {
        console.error('[CLOUD] Error guardando tarea:', error);
        // If the error indicates a missing 'task_group' column, save to localStorage as emergency backup
        if (error.message.includes('column "task_group" does not exist')) {
            console.warn('[CLOUD] "task_group" column not found. Saving group to localStorage as backup.');
            try {
                const storedGroups = localStorage.getItem(LOCAL_STORAGE_GROUP_KEY);
                const groups = storedGroups ? JSON.parse(storedGroups) : {};
                groups[task.id] = task.group || '';
                localStorage.setItem(LOCAL_STORAGE_GROUP_KEY, JSON.stringify(groups));
                alert(`[ ERROR NUBE ] No se guardó la tarea en la nube (columna 'task_group' no existe). El grupo se guardó localmente. \nSugerencia: Revisa que todos los campos sean válidos. Detalle del servidor: ${error.message}`);
            } catch (e) {
                console.error('[CLOUD] Error saving group to localStorage:', e);
                alert(`[ ERROR NUBE ] No se guardó la tarea. \nSugerencia: Revisa que todos los campos sean válidos. Detalle del servidor: ${error.message}`);
            }
        } else {
            alert(`[ ERROR NUBE ] No se guardó la tarea. \nSugerencia: Revisa que todos los campos sean válidos. Detalle del servidor: ${error.message}`);
        }
    }
};

export const deleteTaskFromCloud = async (id: string) => {
    // Also remove from local group backup
    try {
        const storedGroups = localStorage.getItem(LOCAL_STORAGE_GROUP_KEY);
        if (storedGroups) {
            const groups = JSON.parse(storedGroups);
            delete groups[id];
            localStorage.setItem(LOCAL_STORAGE_GROUP_KEY, JSON.stringify(groups));
        }
    } catch { /* ignore */ }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('[CLOUD] Error eliminando tarea:', error);
};

export const saveAllTasksToCloud = async (tasks: Task[]) => {
    if (tasks.length === 0) return;

    // ── STEP 1: Always persist groups to localStorage first (the safety net) ──
    // This ensures groups survive even if Supabase column doesn't exist yet.
    const groupBackup: Record<string, string> = {};
    tasks.forEach(t => {
        if (t.group && t.group.trim()) {
            groupBackup[t.id] = t.group.trim();
        }
    });
    if (Object.keys(groupBackup).length > 0) {
        // Merge with any existing backup instead of overwriting
        try {
            const existing = localStorage.getItem(LOCAL_STORAGE_GROUP_KEY);
            const merged = existing ? { ...JSON.parse(existing), ...groupBackup } : groupBackup;
            localStorage.setItem(LOCAL_STORAGE_GROUP_KEY, JSON.stringify(merged));
        } catch {
            localStorage.setItem(LOCAL_STORAGE_GROUP_KEY, JSON.stringify(groupBackup));
        }
    }

    // ── STEP 2: Try saving to Supabase with task_group column ──
    const rowsWithGroup: TaskRow[] = tasks.map(task => ({
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
        task_group: task.group || '',
        dependencies: task.dependencies,
    }));

    let { error } = await supabase.from('tasks').upsert(rowsWithGroup);

    // ── STEP 3: If task_group column missing, fall back to saving without it ──
    // Groups are still safe in localStorage from Step 1.
    if (error && (error.code === 'PGRST204' || error.message.includes('task_group') || error.message.includes('column'))) {
        console.warn('[CLOUD] "task_group" column not found in Supabase — groups are saved in localStorage. To enable cloud group persistence, run this SQL in the Supabase dashboard: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_group TEXT DEFAULT \'\';');
        const rowsWithoutGroup: TaskRow[] = tasks.map(task => ({
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
            dependencies: task.dependencies,
        }));
        const retryResult = await supabase.from('tasks').upsert(rowsWithoutGroup);
        error = retryResult.error;
    }

    if (error) {
        console.error('[CLOUD] Error en upsert masivo de tareas:', error);
        alert(`[ ERROR MASIVO NUBE ] No se pudieron guardar las tareas. \nDetalle: ${error.message}`);
    }
};
