import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { matrixApi, sectionApi, positionApi, memberApi } from '../services/api';
import type { ApprovalMatrix, ApprovalStep, CreateMatrixDto, UpdateMatrixDto, Section, Position, Member } from '../types';
import { useToast } from '../components/Toast';
import ToastContainer from '../components/Toast';

// ── Sortable Step Item ───────────────────────────────────────
interface SortableStepProps {
  step: ApprovalStep & { id: string };
  index: number;
  positions: Position[];
  sections: Section[];
  members: Member[];
  onChange: (id: string, field: keyof ApprovalStep, value: any) => void;
  onRemove: (id: string) => void;
}

function SortableStepItem({ step, index, positions, sections, members, onChange, onRemove }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const groupedApprovers = useMemo(() => {
    const groups: { section_id: string | null; position_ids: string[]; member_id: string | null }[] = [];
    if (!step.approvers || step.approvers.length === 0) {
      return [{ section_id: null, position_ids: [], member_id: null }];
    }
    step.approvers.forEach(a => {
      let group = groups.find(g => g.section_id === a.section_id);
      if (!group) {
        group = { section_id: a.section_id, position_ids: [], member_id: a.member_id || null };
        groups.push(group);
      }
      if (a.position_id) {
        group.position_ids.push(a.position_id);
      }
      if (a.member_id && !group.member_id) {
        group.member_id = a.member_id;
      }
    });
    return groups;
  }, [step.approvers]);

  const togglePosition = (section_id: string | null, pos_id: string, checked: boolean) => {
    let newApprovers = [...(step.approvers || [])];
    const currentGroup = groupedApprovers.find(g => g.section_id === section_id);
    const currentMemberId = currentGroup?.member_id || null;
    if (checked) {
      if (!newApprovers.some(a => a.section_id === section_id && a.position_id === pos_id)) {
        newApprovers.push({ section_id, position_id: pos_id, member_id: currentMemberId });
      }
    } else {
      newApprovers = newApprovers.filter(a => !(a.section_id === section_id && a.position_id === pos_id));
    }
    if (!newApprovers.some(a => a.section_id === section_id)) {
      newApprovers.push({ section_id, position_id: '', member_id: currentMemberId });
    }
    newApprovers = newApprovers.filter((a, _, self) => {
      if (a.position_id === '') {
        return !self.some(other => other.section_id === a.section_id && other.position_id !== '');
      }
      return true;
    });
    onChange(step.id, 'approvers', newApprovers);
  };

  const changeGroupSection = (old_section_id: string | null, new_section_id: string | null) => {
    const newApprovers = (step.approvers || []).map(a => 
      a.section_id === old_section_id ? { ...a, section_id: new_section_id, member_id: null } : a
    );
    onChange(step.id, 'approvers', newApprovers);
  };

  const changeGroupMember = (section_id: string | null, new_member_id: string | null) => {
    const newApprovers = (step.approvers || []).map(a => 
      a.section_id === section_id 
        ? { ...a, member_id: new_member_id && new_member_id.trim() !== '' ? new_member_id.trim() : null } 
        : a
    );
    onChange(step.id, 'approvers', newApprovers);
  };

  const removeGroup = (section_id: string | null) => {
    let newApprovers = (step.approvers || []).filter(a => a.section_id !== section_id);
    if (newApprovers.length === 0) {
      newApprovers = [{ position_id: '', section_id: null, member_id: null }];
    }
    onChange(step.id, 'approvers', newApprovers);
  };

  const getGroupCandidateMembers = (secId: string | null, posIds: string[], currentMemberId?: string | null) => {
    if (!members || members.length === 0) return [];
    const list = members.filter((m) => {
      if (secId && String(m.agt_member_section).trim() !== String(secId).trim()) {
        return false;
      }
      if (posIds.length > 0 && !posIds.includes(m.agt_member_position)) {
        return false;
      }
      return true;
    });

    if (currentMemberId) {
      const currentObj = members.find((m) => String(m.agt_member_id) === String(currentMemberId));
      if (currentObj && !list.some((m) => String(m.agt_member_id) === String(currentObj.agt_member_id))) {
        list.unshift(currentObj);
      }
    }
    return list;
  };

  return (
    <div ref={setNodeRef} style={style} className={`step-card${isDragging ? ' dragging' : ''}`}>
      {/* Drag Handle */}
      <div className="step-drag-handle" {...attributes} {...listeners} title="ลากเพื่อเรียงลำดับ">
        <svg width="14" height="18" fill="currentColor" viewBox="0 0 14 18">
          <circle cx="4" cy="3" r="1.5"/><circle cx="10" cy="3" r="1.5"/>
          <circle cx="4" cy="9" r="1.5"/><circle cx="10" cy="9" r="1.5"/>
          <circle cx="4" cy="15" r="1.5"/><circle cx="10" cy="15" r="1.5"/>
        </svg>
      </div>

      {/* Step Number */}
      <div className="step-number">{index + 1}</div>

      {/* Fields */}
      <div style={{ flex: 1, display: 'grid', gap: 15 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupedApprovers.map((grp, gIdx) => {
            const candidateMembers = getGroupCandidateMembers(grp.section_id, grp.position_ids, grp.member_id);
            return (
              <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                
                {/* Header row: Section Dropdown & Remove Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">{gIdx === 0 ? 'แผนกผู้อนุมัติ' : 'แผนกผู้อนุมัติ (OR)'}</label>
                    <select
                      className="select"
                      value={grp.section_id ?? ''}
                      onChange={(e) => {
                        const newVal = e.target.value === '' ? null : e.target.value;
                        changeGroupSection(grp.section_id, newVal);
                      }}
                      style={{ background: 'var(--color-bg)' }}
                    >
                      <option value="">แผนกเดียวกับผู้ขอ (default)</option>
                      {sections.map((s) => (
                        <option key={s.id_section} value={s.id_section}>
                          {s.name_section} — {s.name_fullsection}
                        </option>
                      ))}
                    </select>
                  </div>
                  {groupedApprovers.length > 1 && (
                    <button
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)', padding: '0 12px', height: 42, background: 'var(--color-bg)', border: '1px solid var(--border-color)' }}
                      onClick={() => removeGroup(grp.section_id)}
                      title="ลบกลุ่มผู้อนุมัตินี้"
                    >
                      ✖ ลบแผนกนี้
                    </button>
                  )}
                </div>

                {/* Position Checkboxes */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ตำแหน่งที่สามารถอนุมัติได้ (เลือกได้หลายตำแหน่ง)</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', maxHeight: 180, overflowY: 'auto' }}>
                    {positions.map((p) => (
                      <label key={p.agt_position_id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 10px', background: grp.position_ids.includes(p.agt_position_id) ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: grp.position_ids.includes(p.agt_position_id) ? 'white' : 'inherit', borderRadius: 6, border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                        <input 
                          type="checkbox" 
                          checked={grp.position_ids.includes(p.agt_position_id)} 
                          onChange={(e) => togglePosition(grp.section_id, p.agt_position_id, e.target.checked)} 
                          style={{ accentColor: 'var(--color-primary)' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: grp.position_ids.includes(p.agt_position_id) ? 600 : 400 }}>{p.agt_position_name} <span style={{ opacity: 0.8 }}>(Lv.{p.agt_position_level})</span></span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Specific Member Dropdown */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>👤 ผู้อนุมัติเจาะจงบุคคล (Specific Approver - Optional)</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: grp.member_id ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {grp.member_id ? '🔒 ล็อกระบุตัวบุคคลเฉพาะ' : '🌐 อนุมัติได้ทุกคนในตำแหน่งที่เลือก (Default)'}
                    </span>
                  </label>
                  <select
                    className="select"
                    value={grp.member_id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : e.target.value;
                      changeGroupMember(grp.section_id, val);
                    }}
                    style={{
                      background: grp.member_id ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-bg)',
                      borderColor: grp.member_id ? 'var(--color-primary)' : 'var(--border-color)',
                      fontWeight: grp.member_id ? 600 : 400,
                    }}
                  >
                    <option value="">ทุกคนในตำแหน่งที่เลือก (Default — ไม่เจาะจงบุคคล)</option>
                    {candidateMembers.map((m) => (
                      <option key={m.agt_member_id} value={String(m.agt_member_id)}>
                        {m.agt_member_nameTH} ({m.agt_member_nameEN}) [{m.agt_member_id}] — {m.agt_position_name || m.agt_member_position}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            );
          })}

          <div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onChange(step.id, 'approvers', [...step.approvers, { position_id: '', section_id: null }]);
              }}
            >
              + เพิ่มแผนก/เงื่อนไขอื่น (OR)
            </button>
          </div>
        </div>

        {/* Description & Step Key & Skip Option */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 16, alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">คำอธิบายขั้นตอน</label>
            <input
              className="input"
              placeholder="เช่น หัวหน้าแผนกโดยตรง"
              value={step.description}
              onChange={(e) => onChange(step.id, 'description', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Step Key (Optional)</label>
            <input
              className="input"
              placeholder="เช่น step1_sup_req"
              value={step.step_key || ''}
              onChange={(e) => onChange(step.id, 'step_key', e.target.value)}
              title="รหัสระบุขั้นตอนสำหรับ Consumer API เช่น step1_sup_req, step2_sup_mn"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 8, fontSize: 13 }} title="หากติ๊กเลือก ระบบจะข้ามขั้นตอนนี้โดยอัตโนมัติเมื่อผู้ขอมีตำแหน่งสูงกว่าหรือเท่ากัน">
            <input
              type="checkbox"
              checked={step.allow_skip !== false}
              onChange={(e) => onChange(step.id, 'allow_skip', e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>อนุญาตให้ข้าม (Skip-Level)</span>
          </label>
        </div>
      </div>

      {/* Remove */}
      <button className="btn btn-ghost btn-sm" onClick={() => onRemove(step.id)} title="ลบ step นี้" style={{ color: 'var(--color-danger)', marginTop: 2 }}>
        🗑️
      </button>
    </div>
  );
}

// ── Matrix Editor Modal ──────────────────────────────────────
interface EditorProps {
  matrix: ApprovalMatrix | null; // null = create new
  sections: Section[];
  positions: Position[];
  members: Member[];
  onClose: () => void;
  onSave: () => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

function MatrixEditor({ matrix, sections, positions, members, onClose, onSave, addToast }: EditorProps) {
  const [sectionId, setSectionId] = useState<string>(matrix?.section_id || '');
  const [targetPositions, setTargetPositions] = useState<string[]>(matrix?.target_positions || []);
  const [matrixName, setMatrixName] = useState(matrix?.matrix_name || '');
  const [isActive, setIsActive] = useState(matrix?.is_active !== false);
  const [saving, setSaving] = useState(false);

  const [steps, setSteps] = useState<(ApprovalStep & { id: string })[]>(
    (matrix?.approval_steps || []).map((s, i) => {
      let approvers = s.approvers;
      if (!approvers || !Array.isArray(approvers)) {
        approvers = [{ position_id: (s as any).approver_position_id || '', section_id: (s as any).approver_section_id || null }];
      }
      return { ...s, approvers, id: `step-${i}-${Date.now()}` };
    })
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = steps.findIndex((s) => s.id === active.id);
      const newIdx = steps.findIndex((s) => s.id === over.id);
      setSteps(arrayMove(steps, oldIdx, newIdx));
    }
  };

  const addStep = () => {
    const newStep: ApprovalStep & { id: string } = {
      id: `step-new-${Date.now()}`,
      step_order: steps.length + 1,
      step_key: '',
      approvers: [{ position_id: '', section_id: null }],
      description: '',
      allow_skip: true,
    };
    setSteps([...steps, newStep]);
  };

  const changeStep = (id: string, field: keyof ApprovalStep, value: any) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const stepsForApi: ApprovalStep[] = steps.map((s, i) => ({
    step_order: i + 1,
    step_key: s.step_key && s.step_key.trim() !== '' ? s.step_key.trim() : undefined,
    approvers: s.approvers.map((a) => ({
      position_id: a.position_id,
      section_id: a.section_id,
      member_id: a.member_id && String(a.member_id).trim() !== '' ? String(a.member_id).trim() : undefined,
    })),
    description: s.description,
    allow_skip: s.allow_skip !== false,
  }));

  const handleSave = async () => {
    if (!sectionId || targetPositions.length === 0) {
      addToast('error', 'กรุณาเลือกแผนกและตำแหน่งของผู้ขออย่างน้อย 1 ตำแหน่ง');
      return;
    }
    if (steps.length === 0) {
      addToast('error', 'กรุณาเพิ่มอย่างน้อย 1 ขั้นตอนอนุมัติ');
      return;
    }
    if (steps.some((s) => s.approvers.some(a => !a.position_id))) {
      addToast('error', 'กรุณาเลือกตำแหน่งผู้อนุมัติให้ครบทุกเงื่อนไข');
      return;
    }

    setSaving(true);
    try {
      if (matrix) {
        const dto: UpdateMatrixDto = {
          matrix_name: matrixName || undefined,
          approval_steps: stepsForApi,
          is_active: isActive,
        };
        await matrixApi.update(matrix.matrix_id, dto);
        addToast('success', 'อัพเดต Matrix สำเร็จ');
      } else {
        const dto: CreateMatrixDto = {
          section_id: sectionId,
          target_positions: targetPositions,
          matrix_name: matrixName || undefined,
          approval_steps: stepsForApi,
          is_active: isActive,
        };
        await matrixApi.create(dto);
        addToast('success', 'สร้าง Matrix สำเร็จ');
      }
      onSave();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'เกิดข้อผิดพลาด';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760 }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            {matrix ? '✏️ แก้ไข Matrix' : '➕ สร้าง Approval Matrix ใหม่'}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">แผนกผู้ขออนุมัติ *</label>
              <select
                className="select"
                value={sectionId}
                disabled={!!matrix}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">-- เลือกแผนก --</option>
                {sections.map((s) => (
                  <option key={s.id_section} value={s.id_section}>
                    {s.name_section} — {s.name_fullsection}
                  </option>
                ))}
              </select>
              {matrix && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>ไม่สามารถเปลี่ยนได้หลังสร้าง</p>}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">ตำแหน่งผู้ขออนุมัติ (เลือกได้หลายตำแหน่ง) *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', maxHeight: 200, overflowY: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 10px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--border-color)', opacity: !!matrix ? 0.7 : 1 }}>
                  <input type="checkbox" disabled={!!matrix} checked={targetPositions.includes('ALL')} onChange={(e) => {
                    if (e.target.checked) setTargetPositions(['ALL']);
                    else setTargetPositions([]);
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>✨ ทุกตำแหน่ง (ALL)</span>
                </label>
                {positions.map((p) => (
                  <label key={p.agt_position_id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 10px', background: 'var(--color-bg)', borderRadius: 6, border: '1px solid var(--border-color)', opacity: (targetPositions.includes('ALL') || !!matrix) ? 0.5 : 1 }}>
                    <input type="checkbox" disabled={targetPositions.includes('ALL') || !!matrix} checked={targetPositions.includes(p.agt_position_id)} onChange={(e) => {
                      if (e.target.checked) {
                        setTargetPositions(prev => prev.filter(x => x !== 'ALL').concat(p.agt_position_id));
                      } else {
                        setTargetPositions(prev => prev.filter(id => id !== p.agt_position_id));
                      }
                    }} />
                    <span style={{ fontSize: 13 }}>{p.agt_position_name} <span style={{ color: 'var(--color-text-muted)' }}>(Lv.{p.agt_position_level})</span></span>
                  </label>
                ))}
              </div>
              {matrix && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>ไม่สามารถแก้ไขตำแหน่งผู้ขอในโหมดแก้ไขได้ หากต้องการเปลี่ยนกรุณาสร้าง Matrix ใหม่</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">ชื่อ Matrix (optional)</label>
              <input
                className="input"
                placeholder="เช่น IT Staff Approval Flow"
                value={matrixName}
                onChange={(e) => setMatrixName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="is_active" style={{ fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                เปิดใช้งาน
              </label>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>ลำดับการอนุมัติ</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  ลากเพื่อเรียงลำดับ • Lv.น้อย = ตำแหน่งสูง • null section = แผนกเดียวกับผู้ขอ
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addStep}>
                + เพิ่ม Step
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="empty-state" style={{ padding: 32, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>📭</div>
                <div style={{ fontSize: 13 }}>ยังไม่มีขั้นตอน — กด "เพิ่ม Step" ด้านบน</div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {steps.map((step, i) => (
                      <SortableStepItem
                        key={step.id}
                        step={step}
                        index={i}
                        positions={positions}
                        sections={sections}
                        members={members}
                        onChange={changeStep}
                        onRemove={removeStep}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* JSON Preview */}
          {steps.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                📄 JSON Preview (approval_steps)
              </div>
              <div className="json-preview">
                {JSON.stringify(stepsForApi, null, 2)}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> กำลังบันทึก...</> : '💾 บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Matrix List Page ────────────────────────────────────
export default function MatrixListPage() {
  const [matrices, setMatrices] = useState<ApprovalMatrix[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApprovalMatrix | null>(null);
  const [filterSection, setFilterSection] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const { toasts, addToast, removeToast } = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterSection) params.section_id = filterSection;
      if (filterPosition) params.position_id = filterPosition;
      if (filterActive !== '') params.is_active = filterActive === 'true';

      const [matRes, secRes, posRes, memRes] = await Promise.all([
        matrixApi.getAll(params),
        sectionApi.getAll(),
        positionApi.getAll(),
        memberApi.getAll(),
      ]);
      setMatrices(matRes.data.data);
      setSections(secRes.data.data);
      setPositions(posRes.data.data);
      setMembers(memRes.data.data);
    } catch (err) {
      addToast('error', 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [filterSection, filterPosition, filterActive]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (matrix: ApprovalMatrix) => {
    if (!confirm(`ปิดการใช้งาน Matrix: "${matrix.matrix_name || `Matrix #${matrix.matrix_id}`}"?`)) return;
    try {
      await matrixApi.delete(matrix.matrix_id);
      addToast('success', 'ปิดการใช้งาน Matrix สำเร็จ');
      load();
    } catch {
      addToast('error', 'เกิดข้อผิดพลาด');
    }
  };

  const openCreate = () => { setEditTarget(null); setEditorOpen(true); };
  const openEdit = (m: ApprovalMatrix) => { setEditTarget(m); setEditorOpen(true); };

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Approval Matrix</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, fontSize: 14 }}>
            กำหนดเส้นทางอนุมัติสำหรับแต่ละ แผนก × ตำแหน่ง
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + สร้าง Matrix ใหม่
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 180 }} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
          <option value="">ทุกแผนก</option>
          {sections.map((s) => (
            <option key={s.id_section} value={s.id_section}>{s.name_section}</option>
          ))}
        </select>
        <select className="select" style={{ width: 180 }} value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
          <option value="">ทุกตำแหน่ง</option>
          {positions.map((p) => (
            <option key={p.agt_position_id} value={p.agt_position_id}>
              {p.agt_position_name} (Lv.{p.agt_position_level})
            </option>
          ))}
        </select>
        <select className="select" style={{ width: 140 }} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="true">ใช้งาน</option>
          <option value="false">ปิดแล้ว</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => { setFilterSection(''); setFilterPosition(''); setFilterActive(''); }}>
          ล้างตัวกรอง
        </button>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : matrices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div style={{ fontWeight: 600 }}>ไม่พบ Approval Matrix</div>
            <div style={{ fontSize: 13 }}>สร้าง Matrix แรกโดยกดปุ่ม "+ สร้าง Matrix ใหม่"</div>
            <button className="btn btn-primary btn-sm" onClick={openCreate} style={{ marginTop: 8 }}>+ สร้างเลย</button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อ Matrix</th>
                <th>แผนก (ผู้ขอ)</th>
                <th>ตำแหน่ง (ผู้ขอ)</th>
                <th>Steps</th>
                <th>สถานะ</th>
                <th>อัพเดต</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {matrices.map((m) => (
                <tr key={m.matrix_id}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>#{m.matrix_id}</td>
                  <td style={{ fontWeight: 500, maxWidth: 220 }}>
                    <div className="truncate">{m.matrix_name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{(m as any).section_name || m.section_id}</span>
                  </td>
                  <td>
                    {(() => {
                      const posIds = m.target_positions;
                      if (!posIds || posIds.length === 0) return null;
                      if (posIds.includes('ALL')) {
                        return <span className="badge badge-blue" style={{ display: 'inline-block' }}>✨ ทุกตำแหน่ง (ALL)</span>;
                      }

                      if (posIds.length === 1) {
                        const p = positions.find(x => x.agt_position_id === posIds[0]);
                        return (
                          <div style={{ fontSize: 13, padding: '2px 6px', background: 'var(--color-bg-secondary)', borderRadius: 4, display: 'inline-block' }}>
                            {p?.agt_position_name || posIds[0]} <span style={{ color: 'var(--color-text-muted)' }}>(Lv.{p?.agt_position_level || '?'})</span>
                          </div>
                        );
                      }

                      const posObjects = posIds
                        .map(id => positions.find(x => x.agt_position_id === id))
                        .filter(p => p != null) as Position[];
                      
                      if (posObjects.length === 0) return <span>{posIds.join(', ')}</span>;

                      const sorted = [...posObjects].sort((a, b) => (a.agt_position_level || 0) - (b.agt_position_level || 0));
                      const minLvPos = sorted[0];
                      const maxLvPos = sorted[sorted.length - 1];
                      const tooltip = posObjects.map(p => `- ${p.agt_position_name} (Lv.${p.agt_position_level})`).join('\n');

                      return (
                        <div title={tooltip} style={{ fontSize: 13, padding: '4px 8px', background: 'var(--color-bg-secondary)', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-color)', cursor: 'help' }}>
                           <span>{minLvPos.agt_position_name} <span style={{ color: 'var(--color-text-muted)' }}>(Lv.{minLvPos.agt_position_level})</span></span>
                           <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                           <span>{maxLvPos.agt_position_name} <span style={{ color: 'var(--color-text-muted)' }}>(Lv.{maxLvPos.agt_position_level})</span></span>
                           <span className="badge badge-gray" style={{ marginLeft: 4, fontSize: 11, padding: '2px 6px' }}>รวม {posObjects.length} ตำแหน่ง</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-gray">
                        {Array.isArray(m.approval_steps) ? m.approval_steps.length : 0} steps
                      </span>
                      {Array.isArray(m.approval_steps) && m.approval_steps.some(s => s.approvers?.some(a => a.member_id)) && (
                        <span className="badge badge-blue" style={{ fontSize: 11, padding: '2px 6px' }} title="มีขั้นตอนที่ล็อกผู้อนุมัติเจาะจงบุคคล">
                          👤 ล็อกบุคคล
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge-green' : 'badge-red'}`}>
                      {m.is_active ? 'ใช้งาน' : 'ปิดแล้ว'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(m.updated_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)} title="แก้ไข">✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m)} title="ปิดใช้งาน" style={{ color: 'var(--color-danger)' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Matrix Editor Modal */}
      {editorOpen && (
        <MatrixEditor
          matrix={editTarget}
          sections={sections}
          positions={positions}
          members={members}
          onClose={() => setEditorOpen(false)}
          onSave={load}
          addToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
