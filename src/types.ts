export type TaskType = 'INT' | 'AVI' | 'AP' | 'SM';

export interface Task {
    id: string;
    title: string;
    description: string; // Para el tooltip de descripción larga
    type: TaskType;
    start: number; // Día relativo (entero)
    startHour: number; // Hora de inicio (0-23)
    duration: number; // Duración en días (entero)
    durationHours: number; // Duración extra en horas (entero)
    progress: number;
    project: string;
    dependencies: string[]; // IDs de tareas de las que depende
}

export interface Project {
    name: string;
    customer: string;
    ac: string;
    wo: string;
    startDate: string;
    intervalDays: number;
}

export interface AppState {
    tasks: Task[];
    projects: Record<string, Project>;
    activeProject: string;
}
