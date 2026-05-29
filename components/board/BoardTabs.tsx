import type { BoardId } from '@/lib/types';
import { boards } from './board-config';

export function BoardTabs({
  activeBoard,
  onChange
}: {
  activeBoard: BoardId;
  onChange: (board: BoardId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {boards.map((board) => (
        <button
          key={board.id}
          type="button"
          onClick={() => onChange(board.id)}
          className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
            activeBoard === board.id ? board.activeClass : board.className
          }`}
        >
          {board.name}
        </button>
      ))}
    </div>
  );
}
