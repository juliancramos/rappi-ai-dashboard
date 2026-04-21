import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { OfflineEventDataPointDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-offline-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4">Tendencia de Eventos Offline</h3>
      
      <div *ngIf="loading" class="flex justify-center items-center h-64">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-rappi-500 rounded-full mb-3"></div>
          <span class="text-rappi-600 font-medium">Cargando gráficos...</span>
        </div>
      </div>

      <div *ngIf="!loading && !error" class="h-64">
        <canvas baseChart
          [data]="lineChartData"
          [options]="lineChartOptions"
          [type]="'line'">
        </canvas>
      </div>

      <div *ngIf="error" class="text-red-500 text-center py-10">
        {{ error }}
      </div>
    </div>
  `
})
export class OfflineChartComponent implements OnInit {
  loading = true;
  error = '';

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getOfflineEventsSeries().subscribe({
      next: (data: OfflineEventDataPointDTO[]) => {
        const labels = data.map(point => new Date(point.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));
        const values = data.map(point => point.offlineCount);

        this.lineChartData = {
          labels,
          datasets: [
            {
              data: values,
              label: 'Eventos Offline',
              fill: true,
              tension: 0.4,
              borderColor: '#FF4F00',
              backgroundColor: 'rgba(255, 79, 0, 0.1)',
              pointBackgroundColor: '#FF4F00'
            }
          ]
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching offline series:', err);
        this.error = 'No se pudieron cargar los datos del gráfico.';
        this.loading = false;
      }
    });
  }
}
