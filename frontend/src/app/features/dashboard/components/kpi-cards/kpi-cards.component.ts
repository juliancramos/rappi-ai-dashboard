import { Component, Input } from '@angular/core';
import { DashboardStatsDTO } from '../../../../core/models/dashboard.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" *ngIf="stats">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Disponibilidad Total</h3>
        <p class="text-3xl font-bold text-gray-900">{{ stats.uptimePercentage | number:'1.2-4' }}%</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Pico de Visibilidad</h3>
        <p class="text-3xl font-bold text-gray-900">{{ stats.peakVisibility | number }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Incidentes Críticos</h3>
        <p class="text-3xl font-bold text-[#FF4F00]">{{ stats.totalCriticalOutages }}</p>
      </div>
    </div>
  `
})
export class KpiCardsComponent {
  @Input() stats: DashboardStatsDTO | null = null;
}
