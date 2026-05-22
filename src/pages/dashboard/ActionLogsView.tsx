import { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useDatabaseStore, ROLE_LABELS } from '../../store/dbStore';

interface ActionLog {
  id: string;
  role: string;
  pin_role_label: string;
  module: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

const MODULE_TRANSLATIONS: Record<string, string> = {
  sales: 'Ventas',
  inventory: 'Inventario',
  movements: 'Movimientos',
  transit: 'Tránsito',
  recipes: 'Recetas',
  consumption: 'Consumo',
  closings: 'Cierres',
  charts: 'Gráficos',
  analysis: 'Análisis',
  filtered: 'Centro Filtrado',
  hr: 'RR.HH.',
  ai: 'IA',
  settings: 'Configuración',
  payroll: 'Nómina',
  stock: 'Stock',
};

const MODULE_ICONS: Record<string, string> = {
  sales: '🛒',
  inventory: '📦',
  movements: '📋',
  transit: '🚚',
  recipes: '👨‍🍳',
  consumption: '📈',
  closings: '💰',
  charts: '📊',
  analysis: '🔍',
  filtered: '🔎',
  hr: '👥',
  ai: '🤖',
  settings: '⚙️',
  stock: '📉',
};

const ACTION_COLORS: Record<string, string> = {
  CREAR: 'bg-surface-hover border-l-4 border-l-green-500 text-green-700',
  MODIFICAR: 'bg-surface-hover border-l-4 border-l-blue-500 text-blue-700',
  ELIMINAR: 'bg-surface-hover border-l-4 border-l-red-500 text-red-700',
  VENTA: 'bg-surface-hover border-l-4 border-l-purple-500 text-purple-700',
  COBRO: 'bg-surface-hover border-l-4 border-l-yellow-500 text-yellow-700',
  ENVIO: 'bg-surface-hover border-l-4 border-l-cyan-500 text-cyan-700',
  DEVOLUCION: 'bg-surface-hover border-l-4 border-l-orange-500 text-orange-700',
  WASTE: 'bg-surface-hover border-l-4 border-l-red-500 text-red-700',
  CONFIG: 'bg-surface-hover border-l-4 border-l-gray-500 text-gray-700',
  ENTRADA: 'bg-surface-hover border-l-4 border-l-green-500 text-green-700',
  SALIDA: 'bg-surface-hover border-l-4 border-l-red-500 text-red-700',
  MERMA: 'bg-surface-hover border-l-4 border-l-orange-500 text-orange-700',
  SUBIR: 'bg-surface-hover border-l-4 border-l-blue-500 text-blue-700',
  GENERAR_NOMINA: 'bg-surface-hover border-l-4 border-l-green-500 text-green-700',
  ACTUALIZAR_NOMINA: 'bg-surface-hover border-l-4 border-l-blue-500 text-blue-700',
};

const ACTION_TRANSLATIONS: Record<string, string> = {
  CREAR: 'Crear',
  MODIFICAR: 'Modificar',
  ELIMINAR: 'Eliminar',
  VENTA: 'Venta registrada',
  COBRO: 'Cobro de cuenta',
  ENVIO: 'Envío a producción',
  DEVOLUCION: 'Devolución a inventario',
  WASTE: 'Merma desperdiciada',
  CONFIG: 'Cambio de configuración',
  ENTRADA: 'Entrada de producto',
  SALIDA: 'Salida de producto',
  MERMA: 'Merma de producto',
  SUBIR: 'Documento subido',
  GENERAR_NOMINA: 'Nómina Generada',
  ACTUALIZAR_NOMINA: 'Nómina Actualizada',
};

export default function ActionLogsView() {
  const { actionLogs, accessPins, getActionLogs, fetchMore } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    try {
      getActionLogs();
    } catch (err) {
      console.error('[ActionLogsView] Error loading logs:', err);
    }
  }, []);
  const [roleFilter, setRoleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStartDate('');
    setEndDate('');
  };

  const uniqueRoles = useMemo(() => {
    const pins = accessPins || [];
    const roles = pins.map(pin => ROLE_LABELS[pin.role] || pin.role).filter(Boolean);
    return Array.from(new Set(roles)).sort();
  }, [accessPins]);

  const filteredLogs = useMemo(() => {
    const logs = actionLogs || [];
    return logs.filter((log: ActionLog) => {
      const matchesSearch = !searchTerm || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.pin_role_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details?.product_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || (accessPins || []).some(pin => 
        ROLE_LABELS[pin.role] === roleFilter && pin.role === log.role
      );
      
      const logDate = new Date(log.created_at);
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      const matchesStartDate = !start || logDate >= start;
      const matchesEndDate = !end || logDate <= end;

      return matchesSearch && matchesRole && matchesStartDate && matchesEndDate;
    });
  }, [actionLogs, searchTerm, roleFilter, startDate, endDate, accessPins]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const DETAIL_KEY_TRANSLATIONS: Record<string, string> = {
    product_name: 'Producto',
    quantity: 'Cantidad',
    unit: 'Unidad',
    reason: 'Razón',
    category: 'Categoría',
    total: 'Total',
    items_count: 'Items',
    sale_type: 'Tipo de venta',
    employee: 'Empleado',
    is_account_house: 'Cuenta Casa',
    client_name: 'Cliente',
    recipe_name: 'Receta',
    recipe_id: 'ID Receta',
    new_price: 'Nuevo precio',
    ingredients_count: 'Ingredientes',
    doc_type: 'Tipo doc',
    file_name: 'Archivo',
    doc_name: 'Documento',
    changes: 'Cambios',
    closing_date: 'Fecha de cierre',
    total_sales: 'Ventas totales',
    total_discounts: 'Descuentos',
    total_refunds: 'Devoluciones',
    closing_amount: 'Monto del cierre',
    created_by_name: 'Cerrado por',
    month: 'Mes',
    year: 'Año',
    total_employees: 'Total empleados',
    total_net: 'Neto total',
    employee_name: 'Empleado',
    field: 'Campo',
    old_value: 'Valor anterior',
    new_value: 'Nuevo valor',
    // Campos de nómina / RRHH
    earned_salary: 'Salario Devengado',
    base_salary: 'Salario Básico',
    vacation_days: 'Días de Vacación',
    exemption_base: 'Base Exenta',
    taxable_base: 'Base Imponible',
    tax_amount: 'Impuesto',
    special_contribution: 'Contribución Especial',
    net_salary: 'Salario Neto',
    salary: 'Salario',
    justification: 'Justificación',
    payment_method: 'Método de Pago',
  };

  const formatDetails = (details: Record<string, any>, module: string, action: string) => {
    if (!details || Object.keys(details).length === 0) return '-';
    
    if (module === 'movements') {
      const productName = details.product_name || '';
      const qty = details.quantity || '';
      const unit = details.unit || '';
      const reason = details.reason || '';
      return `${productName} ${qty ? `(${qty} ${unit})` : ''}${reason ? ` - ${reason}` : ''}`.trim();
    }
    
    const formatValue = (value: any, key?: string): string => {
      if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
      }
      if (typeof value === 'number') {
        if (key === 'year') {
          return value.toString();
        }
        if (key === 'month') {
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          return monthNames[value - 1] || value.toString();
        }
        if (key?.includes('total') && (key.includes('employees') || key.includes('items') || key.includes('count'))) {
          return value.toString();
        }
        if (key?.includes('total') || key === 'total') {
          return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return value.toLocaleString('es-CO');
      }
      return String(value);
    };
    
    const entries = Object.entries(details).slice(0, 4);
    return entries.map(([key, value]) => {
      const displayKey = DETAIL_KEY_TRANSLATIONS[key] || key.replace(/_/g, ' ');
      return `${displayKey}: ${formatValue(value, key)}`;
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Registro de Acciones
        </h1>
        <p className="text-sm text-text-secondary">
          Historial de acciones realizadas por cada rol en el sistema
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Buscar por acción, módulo o rol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos los roles</option>
          {uniqueRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Desde:</span>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-auto"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Hasta:</span>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {(searchTerm || roleFilter || startDate || endDate) && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium text-left">Fecha/Hora</th>
                <th className="px-4 py-3 font-medium text-left">Rol</th>
                <th className="px-4 py-3 font-medium text-left">Módulo</th>
                <th className="px-4 py-3 font-medium text-left">Acción</th>
                <th className="px-4 py-3 font-medium text-left">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
{paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-secondary">
                  No se encontraron registros de acciones.
                </td>
              </tr>
            ) : (
              paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {log.pin_role_label || log.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {MODULE_TRANSLATIONS[log.module] || log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {ACTION_TRANSLATIONS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary" title={formatDetails(log.details, log.module, log.action)}>
                      {formatDetails(log.details, log.module, log.action)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {hasMoreLogs && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={async () => {
                  setLoadingMore(true);
                  const result = await fetchMore(50);
                  setHasMoreLogs(result.hasMore);
                  setLoadingMore(false);
                }}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando...' : 'Ver más registros'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 px-4 border-t border-border">
          <div className="text-sm text-text-secondary">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} de {filteredLogs.length} registros
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}