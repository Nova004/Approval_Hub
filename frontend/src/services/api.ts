import axios from 'axios';
import type {
  ApprovalMatrix,
  Section,
  Position,
  Member,
  CreateMatrixDto,
  UpdateMatrixDto,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Approval (Core) ──────────────────────────────────────
export const approvalApi = {
  calculate: (memberId: string | number) =>
    api.get('/api/approval/calculate', { params: { member_id: memberId } }),
};

// ── Matrix CRUD ──────────────────────────────────────────
export const matrixApi = {
  getAll: (params?: { section_id?: string | number; position_id?: string | number; is_active?: boolean }) =>
    api.get<{ success: boolean; data: ApprovalMatrix[]; total: number }>('/api/matrix', { params }),

  getById: (id: number) =>
    api.get<{ success: boolean; data: ApprovalMatrix }>(`/api/matrix/${id}`),

  create: (dto: CreateMatrixDto) =>
    api.post('/api/matrix', dto),

  update: (id: number, dto: UpdateMatrixDto) =>
    api.put(`/api/matrix/${id}`, dto),

  delete: (id: number) =>
    api.delete(`/api/matrix/${id}`),
};

// ── Read-only lookups ────────────────────────────────────
export const sectionApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Section[] }>('/api/sections'),
};

export const positionApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Position[] }>('/api/positions'),
};

export const locationApi = {
  getAll: () =>
    api.get<{ success: boolean; data: string[]; total: number }>('/api/locations'),
};

export const memberApi = {
  getAll: (params?: { section_id?: string | number; position_id?: string | number; location?: string; search?: string }) =>
    api.get<{ success: boolean; data: Member[]; total: number }>('/api/members', { params }),

  getById: (id: string | number) =>
    api.get<{ success: boolean; data: Member }>(`/api/members/${id}`),
};

export default api;
