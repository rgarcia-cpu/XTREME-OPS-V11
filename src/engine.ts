import type { Task, AppState } from './types';

/**
 * Optimiza la búsqueda utilizando un Map para eficiencia O(n).
 * Ahora maneja la lógica de horas completas para la cascada de dependencias.
 */
export const recalculateTaskDates = (tasks: Task[]): Task[] => {
    // Asegurar unicidad por ID antes de procesar
    const uniqueMap = new Map();
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
            if (task.dependencies.length === 0) continue;

            let maxDependencyEndInHours = 0;
            task.dependencies.forEach((depId: string) => {
                const dep = taskMap.get(depId);
                if (dep) {
                    const depEndInHours = (dep.start * 24 + dep.startHour) + (dep.duration * 24 + dep.durationHours);
                    if (depEndInHours > maxDependencyEndInHours) maxDependencyEndInHours = depEndInHours;
                }
            });

            const currentTaskStartInHours = task.start * 24 + task.startHour;

            if (currentTaskStartInHours < maxDependencyEndInHours) {
                // Mover al punto más temprano disponible
                task.start = Math.floor(maxDependencyEndInHours / 24);
                task.startHour = maxDependencyEndInHours % 24;
                changed = true;
            }
        }
    }

    return updatedTasks;
};

export const generateStressData = (count: number): Task[] => {
    const tasks: Task[] = [];
    const types: ('AP' | 'INT' | 'AVI' | 'SM')[] = ['AP', 'INT', 'AVI', 'SM'];

    for (let i = 0; i < count; i++) {
        tasks.push({
            id: `stress-${i}`,
            title: `TAREA TÁCTICA AUTOMATIZADA #${i}`,
            description: `DETALLE OPERATIVO PARA LA TAREA #${i}: PROCEDIMIENTO ESTÁNDAR DE VERIFICACIÓN Y CONTROL PARA X-TREME AVIATION CORP.`,
            type: types[i % 4],
            start: Math.floor(i / 10),
            startHour: 8,
            duration: 2 + (i % 5),
            durationHours: 0,
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
            title: 'INSPECCIÓN ESTRUCTURAL FUSELAJE',
            description: 'REVISIÓN COMPLETA DE REMACHES Y PANELES DE ACCESO SEGÚN MANUAL DE MANTENIMIENTO.',
            type: 'AP',
            start: 0,
            startHour: 7,
            duration: 5,
            durationHours: 0,
            progress: 100,
            project: 'UNIT-A22',
            dependencies: []
        },
        {
            id: '2',
            title: 'DESMONTAJE DE INTERIORES',
            description: 'RETIRO DE ASIENTOS, ALFOMBRAS Y PANELES LATERALES PARA ACCESO A CABLEADO.',
            type: 'INT',
            start: 5,
            startHour: 8,
            duration: 3,
            durationHours: 4,
            progress: 60,
            project: 'UNIT-A22',
            dependencies: ['1']
        },
        {
            id: '3',
            title: 'UPGRADE AVIONICS G1000',
            description: 'INSTALACIÓN DE NUEVOS DISPLAYS Y CONFIGURACIÓN DE SISTEMA DE NAVEGACIÓN TÁCTICA.',
            type: 'AVI',
            start: 8,
            startHour: 9,
            duration: 10,
            durationHours: 0,
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
