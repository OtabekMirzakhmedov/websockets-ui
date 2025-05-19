export interface Position {
    x: number;
    y: number;
}

export interface Ship {
    position: Position;
    direction: boolean;
    length: number;
    type: 'small' | 'medium' | 'large' | 'huge';
}