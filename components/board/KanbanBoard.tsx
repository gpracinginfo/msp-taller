import type { Job, JobStatus } from '@/lib/types';
import type { BoardInfo } from './board-config';
import { columns } from './board-config';
import { KanbanColumn } from './KanbanColumn';

export function KanbanBoard({
  jobs,
  activeBoard,
  draggingJobId,
  dragOverStatus,
  messageCountByJobId,
  isReadOnly,
  onDragOver,
  onDragLeave,
  onDrop,
  onOpenJob,
  onDragStart,
  onDragEnd,
  onMoveJob,
  onSyncCalendar,
  onOpenChat,
  onToggleChapaType
}: {
  jobs: Job[];
  activeBoard: BoardInfo;
  draggingJobId: string | null;
  dragOverStatus: JobStatus | null;
  messageCountByJobId: Record<string, number>;
  isReadOnly?: boolean;
  onDragOver: (status: JobStatus) => void;
  onDragLeave: (status: JobStatus) => void;
  onDrop: (status: JobStatus, jobId: string | null) => void;
  onOpenJob: (job: Job) => void;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onMoveJob: (job: Job, direction: number) => void;
  onSyncCalendar: (job: Job) => void;
  onOpenChat: (job: Job) => void;
  onToggleChapaType: (job: Job) => void;
}) {
  return (
    <main className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      {columns
        .filter((column) => column.id !== 'entrega')
        .map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            jobs={jobs.filter((job) => job.status === column.id)}
            activeBoard={activeBoard}
            draggingJobId={draggingJobId}
            isDragOver={dragOverStatus === column.id}
            messageCountByJobId={messageCountByJobId}
            isReadOnly={isReadOnly}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onOpenJob={onOpenJob}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMoveJob={onMoveJob}
            onSyncCalendar={onSyncCalendar}
            onOpenChat={onOpenChat}
            onToggleChapaType={onToggleChapaType}
          />
        ))}
    </main>
  );
}