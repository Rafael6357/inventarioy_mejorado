import React, { useRef } from 'react';
import { Printer, X, Building2, Calendar, User } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface TicketItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface TicketData {
  items: TicketItem[];
  total: number;
  employeeName: string;
  businessName: string;
  ticketMessage: string;
  date: Date;
}

interface TicketViewProps {
  ticketData: TicketData;
  onClose: () => void;
}

export default function TicketView({ ticketData, onClose }: TicketViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="ticket-container">
      <div className="bg-bg rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between print-hide">
          <h2 className="text-lg font-semibold text-text">Ticket</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="print-hide">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4" ref={printRef}>
          <div className="bg-white text-black p-6 rounded-lg font-mono text-sm">
            <div className="text-center mb-4">
              <div className="text-lg font-bold">
                {ticketData.businessName || 'Mi Negocio'}
              </div>
              <div className="border-t border-b border-black my-2 py-1">
                =====================
              </div>
            </div>

            <div className="flex justify-between mb-3 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(ticketData.date)}
              </div>
            </div>

            <div className="flex items-center gap-1 mb-2 text-xs">
              <User className="h-3 w-3" />
              {ticketData.employeeRole ? `${ticketData.employeeRole}: ${ticketData.employeeName}` : (ticketData.employeeName || 'Dueño')}
            </div>

            {ticketData.saleType && (
              <div className="mb-2 text-xs font-medium">
                Tipo: {ticketData.saleType === 'DOMICILIO' ? 'A Domicilio' : 'En Salón'}
              </div>
            )}

            {ticketData.isAccountHouse && (
              <div className="mb-2 text-xs font-bold text-gray-900">
                CUENTA CASA
              </div>
            )}

            {ticketData.deliveryFee > 0 && (
              <div className="mb-2 text-xs">
                Costo Domicilio: {formatCurrency(ticketData.deliveryFee)}
              </div>
            )}

            <div className="space-y-1 mb-3">
              {ticketData.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-black my-2 py-1" />

            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span>
              <span>{formatCurrency(ticketData.total)}</span>
            </div>

            <div className="border-t border-black my-2 py-1" />

            <div className="text-center text-xs mt-4">
              {ticketData.ticketMessage || '¡Gracias por su visita!'}
            </div>

            <div className="text-center mt-2 text-xs">
              =====================
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <Button onClick={handlePrint} className="flex-1 gap-2 print-hide">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 print-hide">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function printTicket(ticketData: TicketData) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return '$' + amount.toFixed(2);
  };

  const ticketHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket - ${ticketData.businessName}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          margin: 0;
          padding: 10px;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 16px;
          margin: 0;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        .item {
          display: flex;
          justify-content: space-between;
        }
        .total {
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 10px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${ticketData.businessName || 'Mi Negocio'}</h1>
        <div class="divider"></div>
      </div>
      
      <div>${formatDate(ticketData.date)}</div>
      <div>Cajero: ${ticketData.employeeName || 'Dueño'}</div>
      <div class="divider"></div>
      
      ${ticketData.items.map(item => `
        <div class="item">
          <span>${item.quantity}x ${item.name}</span>
          <span>${formatCurrency(item.subtotal)}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      
      <div class="item total">
        <span>TOTAL:</span>
        <span>${formatCurrency(ticketData.total)}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <p>${ticketData.ticketMessage || '¡Gracias por su visita!'}</p>
        <div class="divider"></div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(ticketHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}