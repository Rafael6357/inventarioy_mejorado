import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { AlertTriangle, CheckCircle2, Search, FileText, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function TransitView() {
  const { movements, products, justifyMovement } = useDatabaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto Eliminado';

  const filteredMovements = movements
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
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-text">Tránsitos y Auditoría</h1>
        <p className="text-sm text-text-secondary">
          Historial de movimientos y justificación de anomalías
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Buscar por producto o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text">
            <thead className="border-b border-border bg-bg/50 text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    No hay movimientos registrados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
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
                        {new Date(movement.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          movement.type === 'ENTRADA' ? 'bg-success/10 text-success' :
                          movement.type === 'SALIDA' ? 'bg-primary/10 text-primary' :
                          'bg-danger/10 text-danger'
                        }`}>
                          {movement.type}
                        </span>
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-1 text-xs font-medium text-text-secondary">
                            <CheckCircle2 className="h-3 w-3 animate-in fade-in zoom-in duration-500" />
                            Normal
                          </span>
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
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
