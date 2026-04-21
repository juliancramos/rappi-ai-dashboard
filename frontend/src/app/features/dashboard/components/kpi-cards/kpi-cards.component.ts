import { Component, Input } from '@angular/core';
import { DashboardStatsDTO } from '../../../../core/models/dashboard.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8" *ngIf="stats">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center">
        <h3 class="text-base font-semibold text-gray-500 mb-3 tracking-wide uppercase">Disponibilidad Total</h3>
        <p class="text-5xl font-black text-gray-900">{{ stats.uptimePercentage | number:'1.2-4' }}<span class="text-3xl text-gray-400 font-bold ml-1">%</span></p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center">
        <h3 class="text-base font-semibold text-gray-500 mb-3 tracking-wide uppercase">Pico de Visibilidad</h3>
        <p class="text-5xl font-black text-gray-900">{{ stats.peakVisibility | number }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center">
        <h3 class="text-base font-semibold text-gray-500 mb-3 tracking-wide uppercase">Incidentes Críticos</h3>
        <p class="text-5xl font-black text-[#FF4F00]">{{ stats.totalCriticalOutages }}</p>
      </div>
    </div>
  `
})
export class KpiCardsComponent {
  @Input() stats: DashboardStatsDTO | null = null;
}
