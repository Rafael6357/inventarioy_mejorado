import { Button } from './ui/button';

interface PaginationControlsProps {
  page: number;
  total: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({ page, total, itemsPerPage = 10, onPageChange }: PaginationControlsProps) {
  const totalPages = Math.ceil(total / itemsPerPage);
  if (total <= itemsPerPage) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        size="sm"
        variant="outline"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        ← Anterior
      </Button>
      <span className="text-sm text-text-secondary px-3">
        Página {page} de {totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente →
      </Button>
    </div>
  );
}