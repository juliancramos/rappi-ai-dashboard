import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { HealthDataPointDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-health-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  styleUrls: ['./health-chart.component.scss'],
  templateUrl: './health-chart.component.html'
})
export class HealthChartComponent implements OnChanges {
  @Input() data: HealthDataPointDTO[] = [];
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: ChartType = 'line';
  public chartData?: ChartData<'line'>;
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 0
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 20 } }
      },
      x: {
        grid: {
          display: false
        },
        ticks: { font: { size: 20 } }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data.length > 0) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    const labels = this.data.map(d => d.hourBucket);

    const values = this.data.map(d => d.avgVisibility);

    this.chartData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Tiendas Visibles',
          borderColor: '#FF4F00',
          backgroundColor: (context) => {
            if (!context.chart.chartArea) return 'transparent';
            const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, context.chart.chartArea.bottom);
            gradient.addColorStop(0, 'rgba(255, 79, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 79, 0, 0)');
            return gradient;
          },
          fill: true,
          borderWidth: 2
        }
      ]
    };
  }
}
