import { ArrowUpDown } from 'lucide-react';

export default function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string | null; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
  return <ArrowUpDown className={`ml-1 h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} text-primary`} />;
}