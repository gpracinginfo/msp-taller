import type { Job, JobStatus } from '@/lib/types';
import type { BoardInfo, ColumnInfo } from './board-config';
import { JobCard } from './JobCard';

export function KanbanColumn({
  column,
  jobs,
  activeBoard,
  draggingJobId,
  isDragOver,
  messageCountByJobId,
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
  column: ColumnInfo;
  jobs: Job[];
  activeBoard: BoardInfo;
  draggingJobId: string | null;
  isDragOver: boolean;
  messageCountByJobId: Record<string, number>;
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
    <section
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(column.id);
      }}
      onDragLeave={() => onDragLeave(column.id)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(column.id, event.dataTransfer.getData('jobId'));
      }}
      className={`min-h-[420px] rounded-3xl border p-3 shadow-sm transition ${
        column.specialClass || 'border-transparent bg-white'
      } ${
        isDragOver
          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
          : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-black">
          {column.title}
        </h2>

        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold">
          {jobs.length}
        </span>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            activeBoard={activeBoard}
            isDragging={draggingJobId === job.id}
            messageCount={messageCountByJobId[job.id] || 0}
            onOpen={onOpenJob}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMove={onMoveJob}
            onSyncCalendar={onSyncCalendar}
            onOpenChat={() => onOpenChat(job)}
            onToggleChapaType={onToggleChapaType}
          />
        ))}
      </div>
    </section>
  );
}