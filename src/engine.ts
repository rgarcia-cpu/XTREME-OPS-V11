import type { Task, AppState, TaskType } from './types';

/**
 * Optimiza la búsqueda utilizando un Map para eficiencia O(n).
 * Ahora maneja la lógica de horas completas para la cascada de dependencias.
 */
export const recalculateTaskDates = (tasks: Task[]): Task[] => {
    // Asegurar unicidad por ID antes de procesar
    const uniqueMap = new Map<string, Task>();
    tasks.forEach(t => uniqueMap.set(t.id, t));
    const uniqueTasks = Array.from(uniqueMap.values());

    const taskMap = new Map(uniqueTasks.map(t => [t.id, t]));
    const updatedTasks = [...uniqueTasks];
    let changed = true;
    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (changed && iterations < MAX_ITERATIONS) {
        changed = false;
        iterations++;

        for (let i = 0; i < updatedTasks.length; i++) {
            const task = updatedTasks[i];

            // Forzar inicio mínimo en Día 1, máximo en 500 (para atrapar datos corruptos)
            if (task.start < 1) {
                task.start = 1;
                changed = true;
            }
            if (task.start > 500) {
                task.start = 1;
                changed = true;
            }

            if (task.dependencies.length === 0) continue;

            let maxDependencyEnd = 1;
            task.dependencies.forEach((depId: string) => {
                const dep = taskMap.get(depId);
                if (dep) {
                    const depEnd = dep.start + dep.duration;
                    if (depEnd > maxDependencyEnd) maxDependencyEnd = depEnd;
                }
            });

            // Cap so cascading never pushes beyond max days
            const newStart = Math.min(maxDependencyEnd, 500);
            if (task.start < newStart) {
                task.start = newStart;
                changed = true;
            }
        }
    }

    return updatedTasks;
};

export const generateStressData = (count: number): Task[] => {
    const tasks: Task[] = [];
    const types: TaskType[] = ['AP', 'INT', 'AVI', 'SM'];

    for (let i = 0; i < count; i++) {
        tasks.push({
            id: `stress-${i}`,
            itemNumber: `S-${i}`,
            title: `TAREA TÁCTICA AUTOMATIZADA #${i}`,
            description: `DETALLE OPERATIVO PARA LA TAREA #${i}: PROCEDIMIENTO ESTÁNDAR DE VERIFICACIÓN Y CONTROL PARA X-TREME AVIATION CORP.`,
            type: types[i % 4],
            start: Math.floor(i / 10) + 1,
            duration: 2 + (i % 5),
            progress: Math.floor(Math.random() * 100),
            project: 'STRESS-UNIT',
            dependencies: i > 0 ? [`stress-${i - 1}`] : []
        });
    }
    return tasks;
};

export const saveState = (state: AppState) => {
    localStorage.setItem('tactical_ops_v11_state', JSON.stringify(state));
};

export const loadState = (): AppState => {
    const saved = localStorage.getItem('tactical_ops_v11_state');
    if (saved) return JSON.parse(saved);

    const initialTasks: Task[] = [
        {
            id: '1',
            itemNumber: '25-1159',
            title: 'INSPECCIÓN ESTRUCTURAL FUSELAJE',
            description: 'REVISIÓN COMPLETA DE REMACHES Y PANELES DE ACCESO SEGÚN MANUAL DE MANTENIMIENTO.',
            type: 'AP',
            start: 1,
            duration: 5,
            progress: 100,
            project: 'UNIT-A22',
            dependencies: []
        },
        {
            id: '2',
            itemNumber: '25-030',
            title: 'DESMONTAJE DE INTERIORES',
            description: 'RETIRO DE ASIENTOS, ALFOMBRAS Y PANELES LATERALES PARA ACCESO A CABLEADO.',
            type: 'INT',
            start: 6,
            duration: 3,
            progress: 60,
            project: 'UNIT-A22',
            dependencies: ['1']
        },
        {
            id: '3',
            itemNumber: '21-031',
            title: 'UPGRADE AVIONICS G1000',
            description: 'INSTALACIÓN DE NUEVOS DISPLAYS Y CONFIGURACIÓN DE SISTEMA DE NAVEGACIÓN TÁCTICA.',
            type: 'AVI',
            start: 9,
            duration: 10,
            progress: 10,
            project: 'UNIT-A22',
            dependencies: ['2']
        }
    ];

    return {
        tasks: initialTasks,
        projects: {
            'UNIT-A22': {
                name: 'UNIT-A22',
                customer: 'X-TREME AVIATION',
                ac: 'B737-800',
                wo: 'WO-9988',
                startDate: new Date().toISOString().split('T')[0],
                intervalDays: 30
            }
        },
        activeProject: 'UNIT-A22'
    };
};
