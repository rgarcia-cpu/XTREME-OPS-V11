export type TaskType = 'INT' | 'AVI' | 'AP' | 'SM';

export interface Task {
    id: string;
    itemNumber: string; // El número de item del CSV (ej. 25-105-00-01)
    title: string;
    description: string; // Para el tooltip de descripción larga
    type: TaskType;
    start: number; // Día relativo (entero, base 1)
    duration: number; // Duración en días (entero)
    progress: number;
    project: string;
    group?: string; // Grupo para la vista "Mind Map"
    dependencies: string[]; // IDs de tareas de las que depende
}

export interface Project {
    name: string; // Used as the Project ID
    customer: string;
    ac: string;
    model?: string;
    msn?: string;
    wo: string;
    lp?: string;
    pm?: string;
    startDate: string;
    intervalDays: number;
}

export interface AppState {
    tasks: Task[];
    projects: Record<string, Project>;
    activeProject: string;
}
