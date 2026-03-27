import React, { useState, useRef } from 'react';
import { useDatabaseStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { Users, UserPlus, Trash2, Mail, Phone, Briefcase, DollarSign, FileText, Upload, Download, X, FolderOpen, BookOpen, ShieldCheck, Paperclip, Eye, ChevronDown } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

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
  const { employees, addEmployee, deleteEmployee, hrDocuments, uploadHRDocument, fetchHRDocuments, deleteHRDocument } = useDatabaseStore();

  const [activeTab, setActiveTab] = useState<'personal' | 'documentos'>('personal');
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: '',
    salary: 0,
    phone: '',
    email: '',
  });
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<'MANUAL' | 'REGLAMENTO' | 'PNO'>('MANUAL');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedEmployeeDoc, setSelectedEmployeeDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addEmployee({ ...newEmployee });
      setNewEmployee({ name: '', role: '', salary: 0, phone: '', email: '' });
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
                <Label htmlFor="salary">Salario (Mensual) *</Label>
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
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newEmployee.phone}
                  onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
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

              <Button type="submit" className="mt-6 px-8 w-full">
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

            <div className="space-y-3">
              {employees.length === 0 ? (
                <div className="col-span-full py-12 text-center text-text-secondary">
                  No hay empleados registrados.
                </div>
              ) : (
                employees.map(employee => (
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
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">Subir Nuevo Documento</h2>
                <p className="text-xs text-text-secondary">Manuales, reglamentos internos y PNOs disponibles para todo el personal</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Tipo de documento</Label>
                <select
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  value={uploadDocType}
                  onChange={e => setUploadDocType(e.target.value as typeof uploadDocType)}
                  title="Selecciona la categoría del documento"
                >
                  <option value="MANUAL">Manual de Bienvenida</option>
                  <option value="REGLAMENTO">Reglamento Interno</option>
                  <option value="PNO">PNO (Procedimiento)</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-text-secondary">Archivo (PDF, Word, imagen)</Label>
                <div
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  title="Arrastra un archivo o haz clic para seleccionar"
                >
                  <FileText className="h-4 w-4 text-text-secondary shrink-0" />
                  {selectedFile ? (
                    <span className="text-sm text-success truncate">{selectedFile.name}</span>
                  ) : (
                    <span className="text-sm text-text-secondary truncate">Seleccionar archivo...</span>
                  )}
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
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button onClick={handleUploadDoc} disabled={!selectedFile || isUploading} className="gap-2" title="Guardar documento en la biblioteca">
                {isUploading ? (
                  'Subiendo...'
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Subir Documento
                  </>
                )}
              </Button>
              {selectedFile && (
                <Button variant="outline" onClick={() => setSelectedFile(null)} size="sm">
                  <X className="h-4 w-4 mr-1" /> Quitar
                </Button>
              )}
            </div>
          </div>

          {(['MANUAL', 'REGLAMENTO', 'PNO'] as const).map(type => {
            const docs = groupedDocs[type] || [];
            const Icon = DOC_TYPE_ICONS[type];
            const label = DOC_TYPE_LABELS[type];
            const pluralLabel = DOC_TYPE_PLURALS[type] || `${label}s`;

            const sectionStyles: Record<string, string> = {
              MANUAL: 'border-success/30 bg-success/5 [&_.section-icon]:bg-success/10 [&_.section-icon]:text-success',
              REGLAMENTO: 'border-primary/30 bg-primary/5 [&_.section-icon]:bg-primary/10 [&_.section-icon]:text-primary',
              PNO: 'border-warning/30 bg-warning/5 [&_.section-icon]:bg-warning/10 [&_.section-icon]:text-warning',
            };

            return (
              <div key={type} className={`rounded-xl border p-6 shadow-sm ${sectionStyles[type]}`}>
                <div className="mb-4 flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className={`section-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">{pluralLabel}</h3>
                    <p className="text-xs text-text-secondary">
                      {docs.length === 0
                        ? 'No hay documentos cargados'
                        : `${docs.length} documento${docs.length !== 1 ? 's' : ''} disponible${docs.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>

                {docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface/50 py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <Icon className="h-6 w-6 text-text-secondary/40" />
                    </div>
                    <p className="text-sm text-text-secondary">
                      No hay {label.toLowerCase()} cargados.
                    </p>
                    <p className="text-xs text-text-secondary/70 mt-1">
                      Sube uno usando el formulario de arriba.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map(doc => (
                      <div
                        key={doc.id}
                        className="group relative flex items-start gap-3 rounded-xl border border-border/50 bg-surface p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text truncate pr-6">{doc.name}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                            <span>{formatFileSize(doc.file_size || 0)}</span>
                            <span>·</span>
                            <span>{new Date(doc.created_at).toLocaleDateString('es-ES')}</span>
                          </p>
                          <div className="mt-3 flex items-center gap-1.5">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              title="Abrir documento en nueva pestaña"
                            >
                              <Eye className="h-3 w-3" />
                              Ver
                            </a>
                            <a
                              href={doc.file_url}
                              download={doc.file_name}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                              title="Guardar documento en tu dispositivo"
                            >
                              <Download className="h-3 w-3" />
                              Descargar
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          className="absolute right-3 top-3 flex items-center justify-center h-7 w-7 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
