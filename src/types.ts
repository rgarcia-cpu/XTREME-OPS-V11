export type TaskType = 'INT' | 'AVI' | 'AP' | 'SM';

export interface Task {
    id: string;
    title: string;
    description: string; // Para el tooltip de descripción larga
    type: TaskType;
    start: number; // Día relativo (entero, base 1)
    duration: number; // Duración en días (entero)
    progress: number;
    project: string;
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
