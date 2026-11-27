export type Topic = { id: string; name: string; description: string; emoji?: string }
export type Note = { id: string; topic: string; registrationNumber: number; title: string; body: string; tag: string; color: string; date: string }
export type Workspace = { topics: Topic[]; notes: Note[] }
