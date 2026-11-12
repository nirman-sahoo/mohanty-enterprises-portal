import { Category, UnitType } from '../types';

export const CATEGORIES: Category[] = [
  'CEMENT',
  'SCAN TMT BAR',
  'FERTILIZER',
  'Asbestos',
];

export const DEFAULT_UNITS: Record<Category, UnitType[]> = {
  'CEMENT': ['Bags', 'Tons', 'KG'],
  'SCAN TMT BAR': ['Tons', 'KG', 'Pcs'],
  'FERTILIZER': ['Bags', 'KG', 'Bags/Bottles', 'Pcs'],
  'Asbestos': ['Pcs', 'CFT'],
};

export const ALL_UNITS: UnitType[] = ['Bags', 'Tons', 'KG', 'Pcs', 'CFT', 'Bags/Bottles'];

export { formatINR } from '../utils/formatters';
