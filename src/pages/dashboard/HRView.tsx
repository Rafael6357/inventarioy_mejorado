import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Trash2, Mail, Phone, Briefcase, DollarSign, FileText, Upload, Download, X, FolderOpen, BookOpen, ShieldCheck, Paperclip, Eye, ChevronDown, Building2, Calculator, Settings, RefreshCw, Save, Edit, FileSpreadsheet, Camera } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { validateNumber, getNumberFromString, exportToExcel } from '../../lib/utils';

const DOC_TYPE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  REGLAMENTO: 'Reglamento Interno',
  PNO: 'PNO',
  CONTRATO: 'Contrato',
  IDENTIFICACION: 'Identificación',
  OTRO: 'Otro',
};

const DOC_TYPE_PLURALS: Record<string, string> = {
  MANUAL: 'Manuales',
  REGLAMENTO: 'Reglamentos Internos',
  PNO: 'PNOs',
};

const DOC_TYPE_ICONS: Record<string, React.ElementType> = {
  MANUAL: BookOpen,
  REGLAMENTO: ShieldCheck,
  PNO: FolderOpen,
  CONTRATO: FileText,
  IDENTIFICACION: Paperclip,
  OTRO: FileText,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function EmployeeDocumentsPanel({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const { employeeDocuments, uploadEmployeeDocument, fetchEmployeeDocuments, deleteEmployeeDocument } = useDatabaseStore();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docType, setDocType] = useState<'CONTRATO' | 'IDENTIFICACION' | 'OTRO'>('CONTRATO');
  const [customName, setCustomName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docs = employeeDocuments.filter(d => d.employee_id === employeeId);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setIsUploading(true);
    const result = await uploadEmployeeDocument(selectedFile, employeeId, docType, customName || undefined);
    setIsUploading(false);

    if (result.success) {
      toast.success('Documento subido exitosamente');
      setShowUploadForm(false);
      setSelectedFile(null);
      setCustomName('');
      setDocType('CONTRATO');
    } else {
      toast.error(result.error || 'Error al subir el documento');
    }
  };

  const handleDelete = async (doc: typeof docs[0]) => {
    if (!window.confirm(`¿Eliminar el documento "${doc.name}"?`)) return;
    try {
      await deleteEmployeeDocument(doc.id, doc.file_url);
      toast.success('Documento eliminado');
    } catch {
      toast.error('Error al eliminar el documento');
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-text">Documentos de {employeeName}</h4>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-secondary">{docs.length}</span>
        </div>
        <Button
          size="sm"
          variant={showUploadForm ? 'ghost' : 'outline'}
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="h-8 gap-1.5 text-xs"
          title={showUploadForm ? 'Cerrar panel de subida' : 'Subir un documento para este empleado'}
        >
          {showUploadForm ? <X className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
          {showUploadForm ? 'Cancelar' : 'Subir documento'}
        </Button>
      </div>

      {showUploadForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-dashed border-border bg-surface/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">Tipo de documento *</Label>
                <select
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  value={docType}
                  onChange={e => setDocType(e.target.value as typeof docType)}
                  title="Tipo de documento que vas a subir"
                >
                  <option value="CONTRATO">Contrato</option>
                  <option value="IDENTIFICACION">Identificación</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">Nombre (opcional)</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Ej: Contrato 2024"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  title="Nombre personalizado para identificar el documento"
                />
              </div>
          </div>

          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface/30 p-6 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            title="Arrastra un archivo o haz clic para seleccionar"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
            {selectedFile ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-text-secondary">({formatFileSize(selectedFile.size)})</span>
              </div>
            ) : (
              <div className="text-center text-sm text-text-secondary">
                <Upload className="mx-auto mb-2 h-6 w-6 opacity-50" />
                <p>Haz clic o arrastra un archivo</p>
                <p className="text-xs mt-1">PDF, JPG, PNG, DOC, DOCX</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full gap-2"
            size="sm"
            title="Subir el documento seleccionado"
          >
            {isUploading ? 'Subiendo...' : <><Upload className="h-4 w-4" /> Subir documento</>}
          </Button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="py-6 text-center text-sm text-text-secondary">
          No hay documentos cargados para este empleado.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const Icon = DOC_TYPE_ICONS[doc.doc_type] || FileText;
            return (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{doc.name}</p>
                    <p className="text-xs text-text-secondary flex items-center gap-2">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase">{DOC_TYPE_LABELS[doc.doc_type]}</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('es-ES')}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Ver documento"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <a
                    href={doc.file_url}
                    download={doc.file_name}
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-success hover:bg-success/10 transition-colors"
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HRView() {
  const { user } = useAuthStore();
  const { 
    employees, departments, addEmployee, deleteEmployee, 
    hrDocuments, uploadHRDocument, fetchHRDocuments, deleteHRDocument,
    payrollConfig, payrollEntries, calculatePayroll, getPayrollEntries, 
    updatePayrollConfig, updatePayrollEntry, logAction, forceRefreshData,
    getEmployeesCount, getDepartmentsCount, getPayrollEntriesCount
  } = useDatabaseStore();

  const [activeTab, setActiveTab] = useState<'personal' | 'departamentos' | 'nomina' | 'configuracion' | 'documentos'>('personal');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<'MANUAL' | 'REGLAMENTO' | 'PNO'>('MANUAL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEmployeeDoc, setSelectedEmployeeDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [newEmployee, setNewEmployee] = useState({
    name: '', role: '', salary: 0, phone: '', email: '', nit_id: '', category: '', hire_date: '', photo_url: '',
  });
  const [newEmployeePhoto, setNewEmployeePhoto] = useState<File | null>(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<{id: string, name: string} | null>(null);
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [isCalculatingPayroll, setIsCalculatingPayroll] = useState(false);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editingEarnedSalary, setEditingEarnedSalary] = useState<number>(0);
  const [editingVacations, setEditingVacations] = useState<number>(0);

  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [departmentsTotal, setDepartmentsTotal] = useState(0);
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesTotal, setEmployeesTotal] = useState(0);
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollTotal, setPayrollTotal] = useState(0);

  const [configBaseExenta, setConfigBaseExenta] = useState(0);
  const [configImpuesto, setConfigImpuesto] = useState(0);
  
  const [orgDocModal, setOrgDocModal] = useState<'PNO' | 'REGLAMENTO' | null>(null);
  const [orgDocFile, setOrgDocFile] = useState<File | null>(null);
  const [isUploadingOrgDoc, setIsUploadingOrgDoc] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  
  const orgDocsData = {
    PNO: localStorage.getItem('org_doc_pno') || null,
    REGLAMENTO: localStorage.getItem('org_doc_reglamento') || null,
  };
  const [configContribucion, setConfigContribucion] = useState(0);

  useEffect(() => {
    if (payrollConfig) {
      setConfigBaseExenta(payrollConfig.tax_exemption_base);
      setConfigImpuesto(payrollConfig.tax_rate);
      setConfigContribucion(payrollConfig.special_contribution_rate);
    }
  }, [payrollConfig]);

  useEffect(() => {
    const store = useDatabaseStore.getState();
    store.getEmployeesCount(employeeSearchTerm || undefined).then(count => {
      setEmployeesTotal(count);
    });
  }, [employeeSearchTerm]);

  useEffect(() => {
    const store = useDatabaseStore.getState();
    store.getDepartmentsCount().then(count => {
      setDepartmentsTotal(count);
    });
  }, []);

  useEffect(() => {
    const store = useDatabaseStore.getState();
    if (payrollMonth.month && payrollMonth.year) {
      store.getPayrollEntriesCount(payrollMonth.month, payrollMonth.year).then(count => {
        setPayrollTotal(count);
      });
    }
  }, [payrollMonth]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const salaryValidation = validateNumber(String(newEmployee.salary), { required: true, min: 1, fieldName: 'Salario' });
    if (!salaryValidation.isValid) {
      toast.error(salaryValidation.error);
      return;
    }

    try {
      let photoUrl = null;
      if (newEmployeePhoto) {
        const fileName = `employee-${Date.now()}-${newEmployeePhoto.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('hr-documents')
          .upload(fileName, newEmployeePhoto);
        
        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          toast.error('Error al subir la foto');
          return;
        }
        
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      await addEmployee({ 
        name: newEmployee.name, 
        role: newEmployee.role, 
        salary: newEmployee.salary, 
        phone: newEmployee.phone, 
        email: newEmployee.email, 
        nit_id: newEmployee.nit_id, 
        category: newEmployee.category,
        hire_date: newEmployee.hire_date || null,
        photo_url: photoUrl,
      });
      setNewEmployee({ name: '', role: '', salary: 0, phone: '', email: '', nit_id: '', category: '', hire_date: '', photo_url: '' });
      setNewEmployeePhoto(null);
      toast.success('Empleado agregado exitosamente');
    } catch (err) {
      toast.error((err as Error).message || 'Error al agregar el empleado');
    }
  };

  const handleUploadDoc = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setIsUploading(true);
    const result = await uploadHRDocument(selectedFile, uploadDocType);
    setIsUploading(false);

    if (result.success) {
      toast.success('Documento subido exitosamente');
      setSelectedFile(null);
      setUploadDocType('MANUAL');
    } else {
      toast.error(result.error || 'Error al subir el documento');
    }
  };

  const handleDeleteDoc = async (doc: typeof hrDocuments[0]) => {
    if (!window.confirm(`¿Eliminar "${doc.name}"?`)) return;
    try {
      await deleteHRDocument(doc.id, doc.file_url);
      toast.success('Documento eliminado');
    } catch {
      toast.error('Error al eliminar el documento');
    }
  };

  const groupedDocs = hrDocuments.reduce((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {} as Record<string, typeof hrDocuments>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Recursos Humanos</h1>
          <p className="text-sm text-text-secondary">Gestión de personal y documentación laboral</p>
        </div>

        <div className="flex rounded-xl border border-border bg-surface p-1 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'personal'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Users className="h-4 w-4" />
            Personal
          </button>
          <button
            onClick={() => setActiveTab('departamentos')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'departamentos'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Departamentos
          </button>
          <button
            onClick={() => setActiveTab('nomina')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'nomina'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Nómina
          </button>
          <button
            onClick={() => setActiveTab('configuracion')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'configuracion'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuración
          </button>
          <button
              onClick={() => setActiveTab('documentos')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'documentos'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Biblioteca de Documentos
            </button>
        </div>
      </div>

      {activeTab === 'personal' && (
        <div className="grid gap-6 lg:grid-cols-3">
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
                  onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Puesto / Rol *</Label>
                <Input
                  id="role"
                  required
                  placeholder="Ej: Cajero, Cocinero, Mesero..."
                  value={newEmployee.role}
                  onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salario Básico *</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newEmployee.salary || ''}
                  onChange={e => setNewEmployee({ ...newEmployee, salary: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  maxLength={10}
                  placeholder="Máximo 10 dígitos"
                  value={newEmployee.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewEmployee({ ...newEmployee, phone: val });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit_id">NIT / Carnet de Identidad (opcional)</Label>
                <Input
                  id="nit_id"
                  maxLength={11}
                  placeholder="Máximo 11 dígitos"
                  value={newEmployee.nit_id}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setNewEmployee({ ...newEmployee, nit_id: val });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Departamento *</Label>
                <select
                  id="category"
                  required
                  className="flex h-10 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newEmployee.category}
                  onChange={e => setNewEmployee({ ...newEmployee, category: e.target.value })}
                >
                  <option value="">Seleccionar departamento...</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de Contratación</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={newEmployee.hire_date}
                  onChange={e => setNewEmployee({ ...newEmployee, hire_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Foto del Empleado</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors overflow-hidden bg-bg">
                    {newEmployeePhoto ? (
                      <img src={URL.createObjectURL(newEmployeePhoto)} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Camera className="h-6 w-6 text-text-secondary" />
                        <span className="text-[10px] text-text-secondary">Subir</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 500 * 1024) {
                            toast.warning('Archivo muy grande. Se recomienda max 500KB para mejor rendimiento.');
                          }
                          setNewEmployeePhoto(file);
                        }
                      }}
                    />
                  </label>
                  {newEmployeePhoto && (
                    <button
                      type="button"
                      onClick={() => setNewEmployeePhoto(null)}
                      className="text-xs text-danger hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-secondary">Formato: JPG, PNG o WebP. Tamaño máx: 500KB (optimizado: 100-200KB)</p>
              </div>

              <Button type="submit" className="mt-6 px-8 w-full gap-2">
                <UserPlus className="h-4 w-4" />
                Registrar Empleado
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-text">Directorio de Personal</h2>
              <span className="ml-auto rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                {employees.length} empleado{employees.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mb-4">
              <Input
                placeholder="Buscar empleado por nombre..."
                value={employeeSearchTerm}
                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-3">
              {(employeeSearchTerm ? employees.filter(e => e.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())) : employees).length === 0 ? (
                <div className="col-span-full py-12 text-center text-text-secondary">
                  No hay empleados registrados.
                </div>
              ) : (
                (employeeSearchTerm ? employees.filter(e => e.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())) : employees).map(employee => (
                  <div key={employee.id} className="rounded-xl border border-border bg-bg transition-colors hover:border-primary/30">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-text">{employee.name}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3 text-primary/70" />
                              {employee.role}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-primary/70" />
                              ${employee.salary.toFixed(2)}/mes
                            </span>
                            {employee.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-primary/70" />
                                {employee.phone}
                              </span>
                            )}
                            {employee.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-primary/70" />
                                {employee.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)}
                          className={`flex items-center justify-center h-9 w-9 rounded-lg transition-all ${
                            expandedEmployee === employee.id
                              ? 'bg-primary/10 text-primary'
                              : 'text-text-secondary hover:text-primary hover:bg-primary/10'
                          }`}
                          title="Ver documentos del empleado"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('¿Seguro que deseas eliminar este empleado?')) {
                              try {
                                await deleteEmployee(employee.id);
                                toast.success('Empleado eliminado');
                              } catch (err) {
                                toast.error((err as Error).message || 'Error al eliminar');
                              }
                            }
                          }}
                          className="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Eliminar empleado"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {expandedEmployee === employee.id && (
                      <EmployeeDocumentsPanel employeeId={employee.id} employeeName={employee.name} />
                    )}
                  </div>
))
              )}
            </div>

            {departmentsTotal > 10 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={departmentsPage === 1}
                  onClick={() => setDepartmentsPage(p => Math.max(1, p - 1))}
                >
                  ← Anterior
                </Button>
                <span className="text-sm text-text-secondary px-3">
                  Página {departmentsPage} de {Math.ceil(departmentsTotal / 10)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={departmentsPage >= Math.ceil(departmentsTotal / 10)}
                  onClick={() => setDepartmentsPage(p => p + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'departamentos' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-1 h-fit">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-text">Nuevo Departamento</h2>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newDepartment.trim()) return;
              if (departments.some(d => d.name.toLowerCase() === newDepartment.trim().toLowerCase())) {
                toast.error('Ya existe un departamento con ese nombre');
                return;
              }
              setIsCreatingDepartment(true);
              try {
                const { addDepartment } = useDatabaseStore.getState();
                await addDepartment(newDepartment);
                setNewDepartment('');
                toast.success('Departamento creado');
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setIsCreatingDepartment(false);
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Departamento *</Label>
                <Input
                  placeholder="Ej: Cocina, Limpieza..."
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isCreatingDepartment} className="w-full gap-2">
                {isCreatingDepartment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                {isCreatingDepartment ? 'Creando...' : 'Crear'}
              </Button>
            </form>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-text">Lista de Departamentos</h2>
              <span className="ml-auto bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary rounded-full">
                {departments.length}
              </span>
            </div>
            <div className="space-y-3">
              {departments.length === 0 ? (
                <div className="py-12 text-center text-text-secondary">No hay departamentos</div>
              ) : (
                departments.map(dept => {
                  const empCount = employees.filter(e => e.category === dept.id).length;
                  return (
                    <div key={dept.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg hover:border-primary/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {dept.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          {editingDepartment?.id === dept.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingDepartment.name}
                                onChange={e => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                                className="h-8 w-48"
                              />
                              <Button size="sm" onClick={async () => {
                                const { updateDepartment } = useDatabaseStore.getState();
                                await updateDepartment(dept.id, editingDepartment.name);
                                setEditingDepartment(null);
                              }}><Save className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDepartment(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-text">{dept.name}</h3>
                              <p className="text-xs text-text-secondary">{empCount} empleado{empCount !== 1 ? 's' : ''}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {editingDepartment?.id !== dept.id && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingDepartment({ id: dept.id, name: dept.name })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (empCount > 0) { toast.error(`Hay ${empCount} empleados en este departamento`); return; }
                            if (!confirm('¿Eliminar?')) return;
                            const { deleteDepartment } = useDatabaseStore.getState();
                            await deleteDepartment(dept.id);
                          }} className="text-danger hover:text-danger"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {departmentsTotal > 10 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={departmentsPage === 1}
                  onClick={() => setDepartmentsPage(p => Math.max(1, p - 1))}
                >
                  ← Anterior
                </Button>
                <span className="text-sm text-text-secondary px-3">
                  Página {departmentsPage} de {Math.ceil(departmentsTotal / 10)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={departmentsPage >= Math.ceil(departmentsTotal / 10)}
                  onClick={() => setDepartmentsPage(p => p + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'nomina' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text">Generar Nómina</h2>
                  <p className="text-sm text-text-secondary">Calcula automáticamente el salario de todos los empleados</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="h-10 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                  value={payrollMonth.month}
                  onChange={e => setPayrollMonth({ ...payrollMonth, month: Number(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('es', { month: 'long' }).charAt(0).toUpperCase() + new Date(0, i).toLocaleString('es', { month: 'long' }).slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                  value={payrollMonth.year}
                  onChange={e => setPayrollMonth({ ...payrollMonth, year: Number(e.target.value) })}
                >
                  {Array.from({ length: 67 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Button onClick={async () => {
                  const toastId = toast.loading('Calculando nómina...', { duration: 30000 });
                  setIsCalculatingPayroll(true);
                  try {
                    await calculatePayroll(payrollMonth.month, payrollMonth.year);
                    await getPayrollEntries(payrollMonth.month, payrollMonth.year);
                    toast.success('Nómina calculada exitosamente');
                  } catch (err) {
                    toast.error((err as Error).message || 'Error al calcular nómina');
                  } finally {
                    setIsCalculatingPayroll(false);
                    toast.dismiss(toastId);
                  }
                }} disabled={isCalculatingPayroll} className="gap-2 min-w-[140px]">
                  {isCalculatingPayroll ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  {isCalculatingPayroll ? 'Calculando...' : 'Generar Nómina'}
                </Button>
                {payrollEntries.length > 0 && (
                  <Button variant="outline" onClick={() => {
                    const columns = [
                      { header: 'Empleado', key: 'employee_name' },
                      { header: 'Cargo/Ocupación', key: 'role' },
                      { header: 'NIT/Carnet', key: 'nit_id' },
                      { header: 'Salario Base', key: 'base_salary', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                      { header: 'Salario Devengado', key: 'earned_salary', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                      { header: 'Vacaciones (Días)', key: 'vacation_days', format: (v: number) => v?.toString() || '0' },
                      { header: 'Base Exenta', key: 'exemption_base', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                      { header: 'Base Imponible', key: 'taxable_base', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                      { header: 'Retenciones', key: 'tax_amount', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                      { header: 'Neto a Cobrar', key: 'net_salary', format: (v: number) => v?.toFixed(2).replace('.', ',') || '0,00' },
                    ];
                    
                    const data = payrollEntries.map(entry => {
                      const employee = employees.find(e => e.id === entry.employee_id);
                      return {
                        ...entry,
                        role: employee?.role || '',
                        nit_id: employee?.nit_id || '',
                        tax_amount: (entry.tax_amount || 0) + (entry.special_contribution || 0),
                      };
                    });
                    
                    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    exportToExcel(columns, data, `Nomina_${monthNames[payrollMonth.month - 1]}_${payrollMonth.year}`);
                    toast.success('Nómina exportada correctamente');
                  }} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {payrollEntries.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(payrollEntries.reduce((acc, entry) => {
                if (!acc[entry.employee_category]) acc[entry.employee_category] = [];
                acc[entry.employee_category].push(entry);
                return acc;
              }, {} as Record<string, typeof payrollEntries>)).map(([category, entries]) => {
                const categoryTotal = entries.reduce((sum, e) => sum + e.net_salary, 0);
                return (
                  <div key={category} className="rounded-xl border border-border bg-surface overflow-hidden">
                    <div className="bg-primary/5 border-b px-6 py-3 flex justify-between">
                      <h3 className="font-semibold">{category}</h3>
                      <span className="text-sm">Total: <span className="font-bold text-primary">${categoryTotal.toFixed(2)}</span></span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-bg text-text-secondary">
                          <tr>
                            <th className="px-4 py-2 text-left">Empleado</th>
                            <th className="px-4 py-2 text-left">Cargo/Ocupación</th>
                            <th className="px-4 py-2 text-left">NIT/Carnet</th>
                            <th className="px-4 py-2 text-right">Salario Base</th>
                            <th className="px-4 py-2 text-right">Salario Devengado</th>
                            <th className="px-4 py-2 text-right">Vacaciones (Días)</th>
                            <th className="px-4 py-2 text-right">Base Exenta</th>
                            <th className="px-4 py-2 text-right">Base Imponible</th>
                            <th className="px-4 py-2 text-right">Retenciones</th>
                            <th className="px-4 py-2 text-right">Neto a Cobrar</th>
                            <th className="px-4 py-2 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {entries.map(entry => {
                            const employee = employees.find(e => e.id === entry.employee_id);
                            return (
                            <tr key={entry.id} className="hover:bg-bg/50">
                              <td className="px-4 py-2 font-medium">{entry.employee_name}</td>
                              <td className="px-4 py-2 text-text-secondary">{employee?.role || '-'}</td>
                              <td className="px-4 py-2 text-text-secondary">{employee?.nit_id || '-'}</td>
                              <td className="px-4 py-2 text-right text-text-secondary">${entry.base_salary.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">
                                {editingEntry === entry.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingEarnedSalary}
                                      onChange={e => setEditingEarnedSalary(Number(e.target.value))}
                                      className="w-24 h-7 text-right text-sm"
                                      autoFocus
                                    />
                                    <Button size="sm" className="h-7" onClick={async () => {
                                      try {
                                        await updatePayrollEntry(entry.id, { earned_salary: editingEarnedSalary });
                                        await getPayrollEntries(payrollMonth.month, payrollMonth.year);
                                        setEditingEntry(null);
                                        toast.success('Salario actualizado');
                                      } catch (err) {
                                        toast.error((err as Error).message);
                                      }
                                    }}><Save className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingEntry(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1 cursor-pointer hover:text-primary" onClick={() => {
                                    setEditingEntry(entry.id);
                                    setEditingEarnedSalary(entry.earned_salary);
                                  }}>
                                    <span className={entry.is_custom ? 'text-warning font-medium' : ''}>${entry.earned_salary.toFixed(2)}</span>
                                    <Edit className="h-3 w-3 opacity-50" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {editingEntry === entry.id + '_vacations' ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="30"
                                      value={editingVacations}
                                      onChange={e => setEditingVacations(Number(e.target.value))}
                                      className="w-16 h-7 text-center text-sm"
                                      autoFocus
                                    />
                                    <Button size="sm" className="h-7" onClick={async () => {
                                      try {
                                        const { updatePayrollEntry } = useDatabaseStore.getState();
                                        await updatePayrollEntry(entry.id, { vacation_days: editingVacations });
                                        await getPayrollEntries(payrollMonth.month, payrollMonth.year);
                                        setEditingEntry(null);
                                        toast.success('Vacaciones actualizadas');
                                      } catch (err) {
                                        toast.error((err as Error).message);
                                      }
                                    }}><Save className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingEntry(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-primary" onClick={() => {
                                    setEditingEntry(entry.id + '_vacations');
                                    setEditingVacations((entry as any).vacation_days || 0);
                                  }}>
                                    <span>{(entry as any).vacation_days || 0}</span>
                                    <Edit className="h-3 w-3 opacity-50" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-text-secondary">-${entry.exemption_base.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right text-text-secondary">${entry.taxable_base.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right text-danger">${(entry.tax_amount + entry.special_contribution).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-bold text-success">${entry.net_salary.toFixed(2)}</td>
                              <td className="px-4 py-2 text-center">
                                {entry.is_custom && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await useDatabaseStore.getState().regeneratePayrollEntry(entry.id);
                                        await getPayrollEntries(payrollMonth.month, payrollMonth.year);
                                        toast.success('Valores regenerados');
                                      } catch (err) {
                                        toast.error((err as Error).message);
                                      }
                                    }}
                                    className="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                                    title="Regenerar valores por defecto"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {payrollTotal > 20 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={payrollPage === 1}
                    onClick={() => setPayrollPage(p => Math.max(1, p - 1))}
                  >
                    ← Anterior
                  </Button>
                  <span className="text-sm text-text-secondary px-3">
                    Página {payrollPage} de {Math.ceil(payrollTotal / 20)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={payrollPage >= Math.ceil(payrollTotal / 20)}
                    onClick={() => setPayrollPage(p => p + 1)}
                  >
                    Siguiente →
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-primary bg-primary/5 p-4 flex justify-between">
                <span className="font-semibold">Total General Nómina</span>
                <span className="text-xl font-bold text-primary">
                  ${payrollEntries.reduce((sum, e) => sum + e.net_salary, 0).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <Calculator className="h-12 w-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay nómina generada</h3>
              <p className="text-text-secondary">Selecciona el mes y año, luego haz clic en "Generar Nómina"</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'configuracion' && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-text">Parámetros de Nómina</h2>
            </div>
            {payrollConfig ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Base Exenta Mensual ($)</Label>
                  <Input
                    type="number"
                    value={configBaseExenta}
                    onChange={e => setConfigBaseExenta(Number(e.target.value))}
                    onBlur={e => {
                      const { updatePayrollConfig } = useDatabaseStore.getState();
                      updatePayrollConfig({ tax_exemption_base: Number(e.target.value) });
                      toast.success('Base exenta actualizada', { duration: 1500 });
                    }}
                  />
                  <p className="text-xs text-text-secondary">Monto que está libre de impuestos. En Cuba es aproximadamente $4,800 CUP/mes</p>
                </div>
                

                <div className="space-y-2">
                  <Label>% de impuesto sobre la venta</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={configImpuesto}
                    onChange={e => setConfigImpuesto(Number(e.target.value))}
                    onBlur={e => {
                      const { updatePayrollConfig } = useDatabaseStore.getState();
                      updatePayrollConfig({ tax_rate: Number(e.target.value) });
                      toast.success('Porcentaje de impuesto actualizado', { duration: 1500 });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>% Contribución Especial</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={configContribucion}
                    onChange={e => setConfigContribucion(Number(e.target.value))}
                    onBlur={e => {
                      const { updatePayrollConfig } = useDatabaseStore.getState();
                      updatePayrollConfig({ special_contribution_rate: Number(e.target.value) });
                      toast.success('Contribución especial actualizada', { duration: 1500 });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          </div>
</div>
        )}
        
        {activeTab === 'documentos' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* PNO */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-text">PNO</h2>
                <span className="ml-auto text-xs text-text-secondary">Procedimientos Normalizados de Operación</span>
              </div>
              
              {orgDocsData.PNO ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-bg p-4 border border-border">
                    <p className="text-sm text-text-secondary mb-3">Documento actual:</p>
                    <a 
                      href={orgDocsData.PNO} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      Ver documento
                    </a>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setOrgDocModal('PNO')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Reemplazar documento
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-text-secondary opacity-50" />
                  <p className="text-sm text-text-secondary mb-4">No hay documento PNO cargado</p>
                  <Button onClick={() => setOrgDocModal('PNO')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir documento PNO
                  </Button>
                </div>
              )}
            </div>
            
            {/* Reglamento del Negocio */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-text">Reglamento del Negocio</h2>
                <span className="ml-auto text-xs text-text-secondary">Normativas internas</span>
              </div>
              
              {orgDocsData.REGLAMENTO ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-bg p-4 border border-border">
                    <p className="text-sm text-text-secondary mb-3">Documento actual:</p>
                    <a 
                      href={orgDocsData.REGLAMENTO} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      Ver documento
                    </a>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setOrgDocModal('REGLAMENTO')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Reemplazar documento
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-text-secondary opacity-50" />
                  <p className="text-sm text-text-secondary mb-4">No hay documento de reglamento cargado</p>
                  <Button onClick={() => setOrgDocModal('REGLAMENTO')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir reglamento
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      
      {/* Biblioteca de Documentos - Modal para PNO y Reglamento */}
      {orgDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {orgDocModal === 'PNO' ? 'Procedimientos Normalizados de Operación (PNO)' : 'Reglamento del Negocio'}
                  </h2>
                </div>
              </div>
              <button onClick={() => { setOrgDocModal(null); setOrgDocFile(null); }} className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {orgDocsData[orgDocModal] ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-bg p-4 border border-border">
                  <p className="text-sm text-text-secondary mb-2">Documento actual:</p>
                  <a 
                    href={orgDocsData[orgDocModal]!} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver documento
                  </a>
                </div>
                <p className="text-sm text-text-secondary">Para reemplazar, sube un nuevo archivo:</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary mb-4">No hay documento cargado. Sube uno nuevo:</p>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar archivo (PDF, imagen, etc.)</Label>
                <input
                  type="file"
                  accept="*"
                  className="block w-full text-sm text-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setOrgDocFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setOrgDocModal(null); setOrgDocFile(null); }}
                  disabled={isUploadingOrgDoc}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={async () => {
                    if (!orgDocFile) {
                      toast.error('Selecciona un archivo primero');
                      return;
                    }
                    
                    setIsUploadingOrgDoc(true);
                    try {
                      const docType = orgDocModal === 'PNO' ? 'pno' : 'reglamento';
                      const fileName = `${docType}-${Date.now()}-${orgDocFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                      
                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('hr-documents')
                        .upload(fileName, orgDocFile);
                      
                      if (uploadError) {
                        throw new Error(uploadError.message);
                      }
                      
                      if (uploadData) {
                        const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(fileName);
                        const docUrl = urlData.publicUrl;
                        
                        localStorage.setItem(`org_doc_${docType}`, docUrl);
                        toast.success('Documento subido exitosamente');
                        setOrgDocModal(null);
                        setOrgDocFile(null);
                      }
                    } catch (err: any) {
                      toast.error(err.message || 'Error al subir el documento');
                    } finally {
                      setIsUploadingOrgDoc(false);
                    }
                  }}
                  disabled={isUploadingOrgDoc || !orgDocFile}
                >
                  {isUploadingOrgDoc ? 'Subiendo...' : 'Subir Documento'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
