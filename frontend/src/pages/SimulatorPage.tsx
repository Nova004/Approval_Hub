import { useState, useEffect } from 'react';
import { memberApi, approvalApi } from '../services/api';
import type { CalculateResponse } from '../types';

export default function SimulatorPage() {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Search members with debounce
  useEffect(() => {
    if (!search.trim()) { setMembers([]); return; }
    const t = setTimeout(async () => {
      setLoadingMembers(true);
      try {
        const res = await memberApi.getAll({ search });
        setMembers(res.data.data);
      } catch {
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const selectMember = (m: any) => {
    setSelectedMember(m);
    setSearch(`${m.agt_member_nameTH} (${m.agt_member_id})`);
    setMembers([]);
    setResult(null);
    setError(null);
  };

  const handleCalculate = async () => {
    if (!selectedMember) return;
    setCalculating(true);
    setResult(null);
    setError(null);
    try {
      const res = await approvalApi.calculate(selectedMember.agt_member_id);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Simulator</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
          จำลองการคำนวณสายอนุมัติ — เลือกพนักงาน แล้วดูผลลัพธ์ที่ API จะ Return
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>🔍 เลือกพนักงาน</div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                className="input"
                placeholder="ค้นหาชื่อ, รหัส, อีเมล..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedMember(null); }}
              />
              {loadingMembers && (
                <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                </div>
              )}
            </div>

            {/* Dropdown results */}
            {members.length > 0 && (
              <div style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: 12,
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {members.map((m) => (
                  <div
                    key={m.agt_member_id}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.12s',
                    }}
                    onClick={() => selectMember(m)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{m.agt_member_nameTH}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      #{m.agt_member_id} · {m.name_section} · {m.agt_position_name} (Lv.{m.agt_position_level})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected member info */}
            {selectedMember && (
              <div style={{
                background: 'var(--color-primary-glow)',
                border: '1px solid rgba(79,142,247,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-info)' }}>
                  {selectedMember.agt_member_nameTH}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  รหัส: {selectedMember.agt_member_id}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  แผนก: {selectedMember.name_section}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  ตำแหน่ง: {selectedMember.agt_position_name} (Lv.{selectedMember.agt_position_level})
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              disabled={!selectedMember || calculating}
              onClick={handleCalculate}
              style={{ justifyContent: 'center' }}
            >
              {calculating
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> กำลังคำนวณ...</>
                : '▶ จำลองสายอนุมัติ'
              }
            </button>
          </div>

          {/* Info box */}
          <div style={{
            background: 'rgba(79,142,247,0.07)',
            border: '1px solid rgba(79,142,247,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.8,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-info)', marginBottom: 6 }}>📌 Skip-Level Rule</div>
            <div>ระดับเลขน้อย = ตำแหน่งสูงกว่า</div>
            <div>Step ที่ approver level ≥ ระดับผู้ขอ จะถูก <strong style={{ color: 'var(--color-warning)' }}>Skip</strong> ออก</div>
          </div>
        </div>

        {/* Right: Result */}
        <div>
          {!result && !error && !calculating && (
            <div className="glass-card" style={{ padding: 60 }}>
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div style={{ fontWeight: 600 }}>เลือกพนักงานและกดจำลอง</div>
                <div style={{ fontSize: 13 }}>ผลลัพธ์สายอนุมัติจะแสดงที่นี่</div>
              </div>
            </div>
          )}

          {calculating && (
            <div className="glass-card" style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(248,81,73,0.08)',
              border: '1px solid rgba(248,81,73,0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8, fontSize: 16 }}>❌ เกิดข้อผิดพลาด</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>✅ ผลการคำนวณ</div>

                {result.is_auto_approved && (
                  <div style={{
                    background: 'rgba(63,185,80,0.12)',
                    border: '1px solid rgba(63,185,80,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <span style={{ fontSize: 24 }}>✨</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: 15 }}>อนุมัติอัตโนมัติ (Auto-Approved)</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {result.message || 'ผู้ขอเป็นผู้มีอำนาจสูงสุดหรือตำแหน่งสูงกว่าผู้อนุมัติทุกขั้นตอนในระบบ'}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  {[
                    { label: 'Steps ทั้งหมด', value: result.total_steps, color: 'var(--color-primary)' },
                    { label: 'Skipped', value: result.skipped_steps, color: 'var(--color-warning)' },
                    { label: 'ผู้อนุมัติทั้งหมด', value: result.approval_chain.reduce((sum, s) => sum + s.approvers.length, 0), color: 'var(--color-success)' },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Requester info */}
                <div style={{
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>ผู้ขอ: </span>
                  <strong>{result.requester.name_th}</strong>
                  <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>·</span>
                  <span>{result.requester.position.name} (Lv.{result.requester.position.level})</span>
                  <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>·</span>
                  <span>{result.requester.section.name}</span>
                  {result.requester.section.main_section && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                      {' '}→ main: {result.requester.section.main_section.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Approval Chain */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📋 สายการอนุมัติ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {result.approval_chain.map((step, idx) => {
                    if (!step.is_skipped) {
                      return (
                        <div key={`active-${idx}`} className="chain-step">
                          {/* Dot */}
                          <div
                            className="chain-dot"
                            style={{
                              background: 'var(--color-primary-glow)',
                              border: '2px solid var(--color-primary)',
                              color: 'var(--color-primary)',
                            }}
                          >
                            {step.step_order}
                          </div>

                          <div>
                            {/* Step header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                              {step.step_definitions.map((def, dIdx) => (
                                <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                                    {def.position.name}
                                  </span>
                                  <span className="badge badge-gray">Lv.{def.position.level}</span>
                                  {def.section.name && (
                                    <span className="badge badge-blue">{def.section.name}</span>
                                  )}
                                  {dIdx < step.step_definitions.length - 1 && (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12, margin: '0 4px' }}>OR</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Approvers */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {step.approvers.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'var(--color-danger)', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                                  ⚠️ ไม่พบผู้อนุมัติในตำแหน่งนี้
                                </div>
                              ) : step.approvers.map((approver, ai) => (
                                <div key={ai} style={{
                                  background: 'var(--color-bg-elevated)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '10px 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                }}>
                                  <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(79,142,247,0.3), rgba(124,92,252,0.3))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700, color: 'var(--color-primary)',
                                    flexShrink: 0,
                                  }}>
                                    {approver.name_th.charAt(0)}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{approver.name_th}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                      {approver.name_en} · {approver.section.name}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                                    <div>📧 {approver.email || '—'}</div>
                                    {step.approvers.length > 1 && (
                                      <div style={{ color: 'var(--color-warning)', marginTop: 2 }}>#{ai + 1} ใน {step.approvers.length} คน</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={`skip-${idx}`} className="chain-step" style={{ opacity: 0.65 }}>
                          <div className="chain-dot" style={{ background: 'var(--color-bg)', border: '2px dashed var(--color-text-muted)', color: 'var(--color-text-muted)' }}>
                            {step.step_order}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36 }}>
                            <span style={{ fontSize: 13, color: 'var(--color-warning)', fontWeight: 600 }}>⚠️ ถูกข้าม (Skipped)</span>
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{step.skip_reason}</span>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Raw JSON */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  📄 Raw API Response
                </div>
                <div className="json-preview">
                  {JSON.stringify(result, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
