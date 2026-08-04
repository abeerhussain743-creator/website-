import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import api from '../api/client';
import { formatCurrency, STAGE_COLORS, STAGE_LABELS } from '../utils/format';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

function LeadCard({ lead, dragging }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead._id,
    data: { lead },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`lead-card ${isDragging || dragging ? 'dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <h4>
        <Link to={`/leads/${lead._id}`} onClick={(e) => e.stopPropagation()}>{lead.name}</Link>
      </h4>
      <div className="company">{lead.company || 'No company'}</div>
      <div className="meta">
        <span>{formatCurrency(lead.value)}</span>
        <span>{lead.owner?.name?.split(' ')[0] || '—'}</span>
      </div>
    </div>
  );
}

function Column({ stage, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="kanban-col" ref={setNodeRef} style={{ outline: isOver ? '2px solid var(--teal)' : 'none' }}>
      <div className="kanban-col-head">
        <h3>
          <span className="dot" style={{ background: STAGE_COLORS[stage] }} />
          {STAGE_LABELS[stage]}
        </h3>
        <span className="badge badge-slate">{leads.length}</span>
      </div>
      <div className="kanban-cards">
        {leads.map((lead) => (
          <LeadCard key={lead._id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [pipeline, setPipeline] = useState({});
  const [activeLead, setActiveLead] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    const { data } = await api.get('/leads/pipeline/board');
    setPipeline(data.pipeline);
  }

  useEffect(() => {
    load();
  }, []);

  const flatLeads = useMemo(
    () => Object.values(pipeline).flat(),
    [pipeline]
  );

  async function onDragEnd(event) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = active.id;
    const newStage = STAGES.includes(over.id)
      ? over.id
      : flatLeads.find((l) => l._id === over.id)?.stage;

    if (!newStage) return;

    const current = flatLeads.find((l) => l._id === leadId);
    if (!current || current.stage === newStage) return;

    setPipeline((prev) => {
      const next = { ...prev };
      next[current.stage] = next[current.stage].filter((l) => l._id !== leadId);
      next[newStage] = [{ ...current, stage: newStage }, ...(next[newStage] || [])];
      return next;
    });

    try {
      await api.patch(`/leads/${leadId}/move`, { stage: newStage });
    } catch {
      load();
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Kanban pipeline</h1>
          <p>Drag deals across stages to keep the forecast honest.</p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveLead(e.active.data.current?.lead || null)}
        onDragEnd={onDragEnd}
      >
        <div className="kanban">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} leads={pipeline[stage] || []} />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
