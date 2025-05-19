export enum CellState {
    Empty = 0,
    Ship = 1,
    Miss = 2,
    Hit = 3
}

export type Board = CellState[][];

export interface AttackResult {
    status: 'miss' | 'shot' | 'killed';
    killedCells?: Position[];
}

export interface Position {
    x: number;
    y: number;
}