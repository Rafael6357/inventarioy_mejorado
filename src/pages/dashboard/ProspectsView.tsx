import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Phone, Search, Download, CheckCircle, XCircle, Clock, ExternalLink, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Prospect {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  created_at: string;
  subscription_status: string;
}

const ITEMS_PER_PAGE = 10;

export default function ProspectsView() {
  const { user } = useAuthStore();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);

  const totalPages = Math.ceil(totalCount / limit);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProspects();
  }, [page, limit, debouncedSearch, statusFilter]);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('profiles')
        .select('id, name, business_name, email, phone, created_at, subscription_status', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filtros en servidor
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,business_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('subscription_status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setProspects(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching prospects:', error);
      toast.error('Error al cargar los prospectos');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      toast.info('Generando Excel...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, business_name, email, phone, created_at, subscription_status')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const prospectsToExport = data || [];
      
      const excelData = prospectsToExport.map(p => ({
        'Nombre': p.name,
        'Negocio': p.business_name,
        'Email': p.email,
        'Teléfono': p.phone || '',
        'Fecha de Registro': new Date(p.created_at).toLocaleDateString('es-ES'),
        'Estado': p.subscription_status === 'trialing' ? 'Prueba Gratis' : 
                  p.subscription_status === 'active' ? 'Activo' : 
                  p.subscription_status === 'past_due' ? 'Pendiente' : 'Desconocido'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prospectos');
      
      ws['!cols'] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 35 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 }
      ];

      XLSX.writeFile(wb, `prospectos_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar prospectos');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWhatsAppLink = (phone: string) => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('53')) {
      cleanPhone = '53' + cleanPhone;
    }
    const message = encodeURIComponent(
      `Saludos usuario, gracias por registrarse en InventarioY a través de nuestra publicación, su sistema de gestión y control de inventario pensado para negocios cubanos como el suyo. Quien comunica es el desarrollador y estoy a su disposición para brindarle asesoría personalizada y resolver cualquier duda que pueda tener sobre la plataforma. ¿Le gustaría que le explique las funcionalidades principales para llevar el control adecuado de sus entradas y salidas de almacén, o sus recetas, productos vendidos, finanzas, margen? Nuestro sistema puede llevar de manera automática muchos cálculos, actualizaciones, procesos en su negocio, que un excel o de manera manual sería tedioso y muy complejo llevar a cabo.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Prospectos</h1>
        <p className="text-sm text-text-secondary">
          Personas que se han registrado en la plataforma
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Buscar por nombre, negocio, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-border bg-bg px-4 py-2 text-sm text-text"
        >
          <option value="all">Todos los estados</option>
          <option value="trialing">Prueba Gratis</option>
          <option value="active">Activo</option>
          <option value="past_due">Pendiente</option>
        </select>
        <Button variant="outline" onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      {/* Tabla de prospectos */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-text-secondary mt-4">Cargando prospectos...</p>
          </div>
        ) : prospects.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No se encontraron prospectos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prospects.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text">{prospect.name}</p>
                        <p className="text-xs text-text-secondary">{prospect.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-text-secondary" />
                        <span className="text-text">{prospect.business_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {prospect.phone ? (
                        <span className="font-mono text-sm">{prospect.phone}</span>
                      ) : (
                        <span className="text-text-secondary text-sm">Sin teléfono</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {prospect.subscription_status === 'trialing' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
                          <Clock className="h-3 w-3" />
                          Prueba Gratis
                        </span>
                      )}
                      {prospect.subscription_status === 'active' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          <CheckCircle className="h-3 w-3" />
                          Activo
                        </span>
                      )}
                      {prospect.subscription_status === 'past_due' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                          <XCircle className="h-3 w-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {formatDate(prospect.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {prospect.phone && (
                        <a
                          href={getWhatsAppLink(prospect.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          Contactar
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-secondary">
            Mostrando {startItem}-{endItem} de {totalCount} prospectos
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {renderPageNumbers().map((p, idx) => (
                typeof p === 'number' ? (
                  <Button
                    key={idx}
                    variant={p === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(p)}
                    className="min-w-8"
                  >
                    {p}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-text-secondary">...</span>
                )
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {!loading && totalCount === 0 && (
        <div className="text-sm text-text-secondary text-center">
          No hay prospectos para mostrar
        </div>
      )}
    </div>
  );
}