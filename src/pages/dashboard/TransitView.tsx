import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { AlertTriangle, CheckCircle2, Search, FileText, X, Clock, ArrowRightLeft } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function TransitView() {
  const { movements, products, justifyMovement } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ELABORACION' | 'ANOMALIAS'>('ELABORACION');
  
  // Modal state
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto Eliminado';

  const transitMovements = movements
    .filter(m => m.type === 'SALIDA')
    .filter(m => !m.reason?.startsWith('Venta')) // Solo salidas manuales desde Inventario
    .filter(m => 
      getProductName(m.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const anomalyMovements = movements
    .filter(m => m.status === 'ANOMALIA' || m.status === 'JUSTIFICADO')
    .filter(m => 
      getProductName(m.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleJustify = (e: React.FormEvent) => {
    e.preventDefault();
    if (justifyingId && justificationText.trim()) {
      justifyMovement(justifyingId, justificationText);
      setJustifyingId(null);
      setJustificationText('');
      toast.success('Anomalía justificada exitosamente');
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-text">Tránsito y Anomalías</h1>
        <p className="text-sm text-text-secondary">
          Gestión de productos en elaboración, detección de anomalías y sistema de justificación
        </p>
      </div>

      <div className="flex space-x-1 rounded-xl bg-surface p-1 shadow-sm border border-border">
        <button
          onClick={() => setActiveTab('ELABORACION')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            activeTab === 'ELABORACION'
              ? 'bg-primary text-bg shadow-sm'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text'
          }`}
        >
          <Clock className="h-4 w-4" />
          En Elaboración
        </button>
        <button
          onClick={() => setActiveTab('ANOMALIAS')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            activeTab === 'ANOMALIAS'
              ? 'bg-danger text-white shadow-sm'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Anomalías Detectadas
          {anomalyMovements.filter(m => m.status === 'ANOMALIA').length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs text-white">
              {anomalyMovements.filter(m => m.status === 'ANOMALIA').length}
            </span>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por producto o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text [&_tr]:divide-x [&_tr]:divide-border/50">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                {activeTab === 'ELABORACION' && <th className="px-4 py-3 font-medium">Motivo/Destino</th>}
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                {activeTab === 'ANOMALIAS' && <th className="px-4 py-3 font-medium text-center">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeTab === 'ELABORACION' ? (
                transitMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                      No hay productos en elaboración actualmente.
                    </td>
                  </tr>
                ) : (
                  transitMovements.map((movement) => (
                    <tr key={movement.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                        {new Date(movement.date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{getProductName(movement.productId)}</td>
                      <td className="px-4 py-3 text-right font-mono text-primary">
                        {movement.quantity} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]" title={movement.reason || 'Envío a producción'}>
                        {movement.reason || 'Envío a producción'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          <Clock className="h-3 w-3" />
                          En Proceso
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                anomalyMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                      No hay anomalías registradas.
                    </td>
                  </tr>
                ) : (
                  anomalyMovements.map((movement) => {
                    const isAnomaly = movement.status === 'ANOMALIA';
                    const isJustified = movement.status === 'JUSTIFICADO';
                    
                    return (
                      <tr
                        key={movement.id}
                        className={`transition-colors hover:bg-surface-hover ${
                          isAnomaly ? 'bg-danger/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                          {new Date(movement.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium">{getProductName(movement.productId)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {movement.type === 'ENTRADA' ? '+' : '-'}{movement.quantity} {movement.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAnomaly ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                              <AlertTriangle className="h-3 w-3" />
                              Anomalía
                            </span>
                          ) : isJustified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success" title={movement.justification}>
                              <CheckCircle2 className="h-3 w-3" />
                              Justificado
                            </span>
                          ) : (
                            <span className="text-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAnomaly ? (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="h-8 text-xs"
                              onClick={() => setJustifyingId(movement.id)}
                            >
                              Justificar
                            </Button>
                          ) : movement.reason || movement.justification ? (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={movement.justification || movement.reason}>
                              <FileText className="h-4 w-4 text-text-secondary" />
                            </Button>
                          ) : (
                            <span className="text-text-secondary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Justification Modal */}
      {justifyingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                Justificar Anomalía
              </h3>
              <button 
                onClick={() => setJustifyingId(null)}
                className="text-text-secondary hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleJustify} className="space-y-4">
              <p className="text-sm text-text-secondary">
                Este movimiento fue detectado como inusual. Por favor, ingresa una justificación detallada para el registro de auditoría.
              </p>
              
              <textarea
                required
                rows={4}
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Ej: Se retiró stock adicional para un evento especial..."
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
              />
              
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setJustifyingId(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="default">
                  Guardar Justificación
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
