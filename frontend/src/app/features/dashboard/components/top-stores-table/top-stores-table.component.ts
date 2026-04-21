import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { StoreOfflineRankingDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-top-stores-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 border-b border-gray-100">
        <h3 class="text-lg font-bold text-gray-800">Top 5 Tiendas Offline</h3>
      </div>
      
      <div *ngIf="loading" class="p-10 flex justify-center">
        <span class="text-rappi-600 font-medium animate-pulse">Cargando datos...</span>
      </div>

      <div *ngIf="error" class="p-10 text-center text-red-500">
        {{ error }}
      </div>

      <div class="overflow-x-auto" *ngIf="!loading && !error">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold">Tienda</th>
              <th scope="col" class="px-6 py-4 font-semibold text-right">Caídas (Eventos)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let store of topStores; let i = index" 
                class="bg-white border-b hover:bg-rappi-50 transition-colors">
              <td class="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                <span class="flex items-center justify-center w-6 h-6 rounded-full bg-rappi-100 text-rappi-600 font-bold text-xs">
                  {{ i + 1 }}
                </span>
                {{ store.storeName }}
              </td>
              <td class="px-6 py-4 text-right text-gray-600 font-semibold">
                {{ store.offlineCount }}
              </td>
            </tr>
            <tr *ngIf="topStores.length === 0" class="bg-white">
              <td colspan="2" class="px-6 py-8 text-center text-gray-500">
                No hay datos de tiendas registrados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class TopStoresTableComponent implements OnInit {
  topStores: StoreOfflineRankingDTO[] = [];
  loading = true;
  error = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getTopOfflineStores().subscribe({
      next: (data) => {
        this.topStores = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching top stores:', err);
        this.error = 'Error al cargar el ranking de tiendas.';
        this.loading = false;
      }
    });
  }
}
