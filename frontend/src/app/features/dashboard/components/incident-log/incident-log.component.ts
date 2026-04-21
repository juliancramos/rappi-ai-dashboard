import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CriticalIncidentDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-incident-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 border-b border-gray-100">
        <h3 class="text-lg font-bold text-gray-900">Registro de Incidentes Críticos</h3>
        <p class="text-sm text-gray-500">Eventos con cero tiendas visibles</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
            <tr>
              <th class="px-6 py-3">Fecha y Hora</th>
              <th class="px-6 py-3">Métrica</th>
              <th class="px-6 py-3">Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let incident of incidents" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 font-medium text-gray-900">{{ incident.timestamp | date:'medium' }}</td>
              <td class="px-6 py-4 text-gray-600">{{ incident.metric }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-[#FF4F00]">
                  {{ incident.statusValue }}
                </span>
              </td>
            </tr>
            <tr *ngIf="incidents.length === 0">
              <td colspan="3" class="px-6 py-8 text-center text-gray-500">
                No se registraron incidentes críticos.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class IncidentLogComponent {
  @Input() incidents: CriticalIncidentDTO[] = [];
}
