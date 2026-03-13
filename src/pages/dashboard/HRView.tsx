import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Users, UserPlus, Trash2, Mail, Phone, Briefcase, DollarSign } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';

export default function HRView() {
  const { user } = useAuthStore();
  const { employees, addEmployee, deleteEmployee } = useDatabaseStore();
  
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: '',
    salary: 0,
    phone: '',
    email: '',
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    addEmployee({
      ...newEmployee,
      businessId: user.businessName,
    });

    setNewEmployee({
      name: '',
      role: '',
      salary: 0,
      phone: '',
      email: '',
    });
    alert('Empleado agregado exitosamente');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Recursos Humanos</h1>
        <p className="text-sm text-text-secondary">
          Gestión de personal, roles y salarios
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel Izquierdo - Alta de Empleado */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-1 h-fit">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Nuevo Empleado</h2>
          </div>

          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input 
                id="name" 
                required 
                value={newEmployee.name} 
                onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Puesto / Rol *</Label>
              <Input 
                id="role" 
                required 
                placeholder="Ej: Cajero, Cocinero, Mesero..."
                value={newEmployee.role} 
                onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salario (Mensual) *</Label>
              <Input 
                id="salary" 
                type="number" 
                min="0" 
                step="0.01" 
                required 
                value={newEmployee.salary || ''} 
                onChange={e => setNewEmployee({...newEmployee, salary: Number(e.target.value)})} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={newEmployee.phone} 
                onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                value={newEmployee.email} 
                onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} 
              />
            </div>

            <Button type="submit" className="w-full mt-6">
              Registrar Empleado
            </Button>
          </form>
        </div>

        {/* Panel Derecho - Lista de Empleados */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-text">Directorio de Personal</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {employees.length === 0 ? (
              <div className="col-span-full py-12 text-center text-text-secondary">
                No hay empleados registrados.
              </div>
            ) : (
              employees.map(employee => (
                <div key={employee.id} className="relative flex flex-col rounded-xl border border-border bg-bg p-4 transition-colors hover:border-primary/50">
                  <button 
                    onClick={() => {
                      if(window.confirm('¿Seguro que deseas eliminar este empleado?')) {
                        deleteEmployee(employee.id);
                      }
                    }}
                    className="absolute right-4 top-4 text-text-secondary hover:text-danger transition-colors"
                    title="Eliminar empleado"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <h3 className="font-semibold text-text text-lg pr-8">{employee.name}</h3>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary/70" />
                      <span>{employee.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary/70" />
                      <span>${employee.salary.toFixed(2)} / mes</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary/70" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary/70" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
