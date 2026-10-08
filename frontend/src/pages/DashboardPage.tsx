import { useEffect, useState } from 'react';
import { matrixApi, sectionApi, positionApi, memberApi } from '../services/api';

interface Stats {
  sections: number;
  positions: number;
  members: number;
  matrices: number;
  activeMatrices: number;
}

interface CoverageCell {
  section_id: string;
  section_name: string;
  position_id: string;
  position_name: string;
  position_level: number;
  has_matrix: boolean;
  matrix_id?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [coverage, setCoverage] = useState<CoverageCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [secRes, posRes, memRes, matRes] = await Promise.all([
          sectionApi.getAll(),
          positionApi.getAll(),
          memberApi.getAll(),
          matrixApi.getAll(),
        ]);

        const secs = secRes.data.data;
        const poss = posRes.data.data;
        const mems = memRes.data.data;
        const mats = matRes.data.data;

        setStats({
          sections: secs.length,
          positions: poss.length,
          members: mems.length,
          matrices: mats.length,
          activeMatrices: mats.filter((m: any) => m.is_active).length,
        });

        // Build coverage heatmap (main sections only)
        const mainSecs = secs.filter((s: any) =>
          s.sub_section !== null && s.sub_section !== ''
          || !secs.some((p: any) =>
            p.sub_section && p.sub_section.split(',').map((x: string) => x.trim()).includes(String(s.id_section))
          )
        );

        const cells: CoverageCell[] = [];
        for (const sec of mainSecs) {
          for (const pos of poss) {
            const mat = mats.find(
              (m: any) =>
                m.section_id === sec.id_section &&
                m.is_active &&
                (Array.isArray(m.target_positions)
                  ? m.target_positions.includes('ALL') || m.target_positions.includes(pos.agt_position_id)
                  : false)
            );
            cells.push({
              section_id: sec.id_section,
              section_name: sec.name_section,
              position_id: pos.agt_position_id,
              position_name: pos.agt_position_name,
              position_level: pos.agt_position_level,
              has_matrix: !!mat,
              matrix_id: mat?.matrix_id,
            });
          }
        }
        setCoverage(cells);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { icon: '🏢', label: 'แผนก', value: stats?.sections ?? '-', color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)' },
    { icon: '💼', label: 'ตำแหน่ง', value: stats?.positions ?? '-', color: '#58a6ff', bg: 'rgba(88,166,255,0.1)' },
    { icon: '👥', label: 'พนักงาน', value: stats?.members ?? '-', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
    { icon: '📋', label: 'Approval Matrix', value: `${stats?.activeMatrices ?? '-'} / ${stats?.matrices ?? '-'}`, color: '#d29922', bg: 'rgba(210,153,34,0.1)' },
  ];

  // Get unique sections/positions in coverage for table headers
  const uniqueSections = [...new Map(coverage.map((c) => [c.section_id, { id: c.section_id, name: c.section_name }])).values()];
  const uniquePositions = [...new Map(coverage.map((c) => [c.position_id, { id: c.position_id, name: c.position_name, level: c.position_level }])).values()]
    .sort((a, b) => a.level - b.level);

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          ภาพรวมระบบ Approval Routing Engine
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {statCards.map((card) => (
              <div key={card.label} className="stat-card">
                <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {card.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coverage Heatmap */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Matrix Coverage</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
                ตรวจสอบว่า แผนก × ตำแหน่ง ไหนยังไม่มี Approval Matrix — คลิกช่องสีแดงเพื่อสร้าง
              </p>
            </div>

            {uniqueSections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div>ไม่พบข้อมูลแผนกในระบบ</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}>
                        แผนก ↓ / ตำแหน่ง →
                      </th>
                      {uniquePositions.map((pos) => (
                        <th key={pos.id} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                          <div>{pos.name}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>Lv.{pos.level}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueSections.map((sec) => (
                      <tr key={sec.id}>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                          {sec.name}
                        </td>
                        {uniquePositions.map((pos) => {
                          const cell = coverage.find(
                            (c) => c.section_id === sec.id && c.position_id === pos.id
                          );
                          return (
                            <td key={pos.id} style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                              <div
                                className={`coverage-cell ${cell?.has_matrix ? 'has-matrix' : 'no-matrix'}`}
                                title={cell?.has_matrix ? `Matrix ID: ${cell.matrix_id}` : 'คลิกเพื่อสร้าง Matrix'}
                              >
                                {cell?.has_matrix ? '✓' : '—'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.3)' }} />
                มี Matrix แล้ว
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(248,81,73,0.08)', border: '1px dashed rgba(248,81,73,0.2)' }} />
                ยังไม่มี Matrix
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
