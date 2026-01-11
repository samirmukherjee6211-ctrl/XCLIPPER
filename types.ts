
export interface Persona {
  id: string;
  name: string;
  images: string[];
  identityProfile: string | null;
  isTrained: boolean;
}

export interface ImageState {
  original: string | null;
  edited: string | null;
  mask: string | null;
}

export enum ToolType {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER'
}

export enum EditorMode {
  GENERAL = 'GENERAL',
  FACE_SWAP = 'FACE_SWAP'
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingAction {
  points: DrawingPoint[];
  color: string;
  size: number;
  tool: ToolType;
}
