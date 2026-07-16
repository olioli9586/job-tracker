export interface Application {
    id: number;
    originalId?: number;
    company: string;
    position: string;
    date: string;
    timestamp: string;
    fullDate: string; // ISO string
    status: string;
    lastUpdated: string; // ISO string
    nextStageType?: string;
    deadline?: string;
    notes?: string;
    jobDescription?: string;
    pinned?: boolean;
}

export interface DailyEntry {
    id: number;
    date: string;
    count: number;
    timestamps: string; // JSON string
}

export interface Stats {
    entries: DailyEntry[];
    rejectionCount: number;
}
