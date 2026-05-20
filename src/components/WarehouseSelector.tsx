import { useEffect } from 'react';
import { useDatabaseStore } from '../store/dbStore';
import { Warehouse, ChevronDown } from 'lucide-react';

export default function WarehouseSelector() {
  const { warehouses, currentWarehouseId, setCurrentWarehouse, fetchWarehouses, fetchProductWarehouse } = useDatabaseStore();
  
  // Cargar almacenes al montar
  useEffect(() => {
    fetchWarehouses().then(() => {
      fetchProductWarehouse();
    });
  }, []);
  
  const currentWarehouse = warehouses.find(w => w.id === currentWarehouseId);
  
  if (warehouses.length <= 1) {
    return null;
  }
  
  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-sm hover:bg-surface-hover transition-colors"
        onClick={() => {}}
      >
        <Warehouse className="h-4 w-4 text-primary" />
        <span className="font-medium">{currentWarehouse?.name || 'Almacén'}</span>
        <ChevronDown className="h-3 w-3 text-text-secondary" />
      </button>
      
      {/* Dropdown */}
      <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-1">
          {warehouses.map((warehouse) => (
            <button
              key={warehouse.id}
              onClick={() => setCurrentWarehouse(warehouse.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-surface-hover transition-colors ${
                currentWarehouseId === warehouse.id ? 'bg-primary/10 text-primary font-medium' : 'text-text'
              }`}
            >
              {warehouse.name}
              {warehouse.is_main && <span className="ml-2 text-xs text-text-secondary">(Principal)</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}