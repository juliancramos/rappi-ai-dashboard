import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { HourlyPatternDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-hourly-patterns',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  styleUrls: ['./hourly-patterns.component.scss'],
  templateUrl: './hourly-patterns.component.html'
})
export class HourlyPatternsComponent implements OnChanges {
  @Input() data: HourlyPatternDTO[] = [];
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public chartType: ChartType = 'bar';
  public chartData?: ChartData<'bar'>;
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 20 } } },
      x: { grid: { display: false }, ticks: { font: { size: 20 } } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        titleFont: { size: 20 },
        bodyFont: { size: 18 },
        padding: 12
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data.length > 0) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    const labels = this.data.map(d => `${d.hourOfDay}:00`);
    const values = this.data.map(d => d.averageVisibility);
    
    // Normalize to create a color gradient prioritizing low visibility (alerting logic)
    const maxVal = Math.max(...values, 19500);
    const minVal = Math.min(...values, 0);

    const backgroundColors = values.map(val => {
      // Ratio of visibility (1.0 = perfect, 0.0 = total outage)
      const ratio = val / maxVal;
      // Dark red for low visibility, bright orange for high visibility
      return `rgba(255, ${Math.floor(79 * ratio)}, 0, ${0.4 + 0.6 * ratio})`;
    });

    this.chartData = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Visibilidad Promedio',
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderColor: '#FF4F00'
        }
      ]
    };
  }
}
