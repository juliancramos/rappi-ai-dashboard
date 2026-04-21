import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeatmapDataPointDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-intensity-heatmap',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./intensity-heatmap.component.scss'],
  templateUrl: './intensity-heatmap.component.html'
})
export class IntensityHeatmapComponent implements OnChanges {
  @Input() data: HeatmapDataPointDTO[] = [];

  public hours: string[] = [];
  public dates: string[] = [];
  
  // matrix[date][hour] = visibility value
  public matrix: { [key: string]: { [key: string]: number } } = {};
  public maxVisibility = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data.length > 0) {
      this.processData();
    }
  }

  private processData(): void {
    const hoursSet = new Set<string>();
    const datesSet = new Set<string>();
    
    let maxVal = 0;

    this.data.forEach(d => {
      hoursSet.add(d.hour);
      datesSet.add(d.date);

      if (!this.matrix[d.date]) {
        this.matrix[d.date] = {};
      }
      this.matrix[d.date][d.hour] = d.averageVisibility;

      if (d.averageVisibility > maxVal) {
        maxVal = d.averageVisibility;
      }
    });

    this.hours = Array.from(hoursSet).sort();
    this.dates = Array.from(datesSet).sort();
    this.maxVisibility = maxVal > 0 ? maxVal : 1;
  }

  getBgColor(date: string, hour: string): string {
    const val = this.matrix[date]?.[hour];
    if (val === undefined || val === null) {
      return 'rgb(30, 30, 30)'; // Dark/Black for no data / zero visibility
    }

    const ratio = val / this.maxVisibility;
    
    // Scale: Low (0) = Dark, High (1) = Bright Orange (#FF4F00 / rgba(255, 79, 0))
    // We mix black (0,0,0) with orange (255, 79, 0)
    const r = Math.floor(255 * ratio);
    const g = Math.floor(79 * ratio);
    const b = 0;

    return `rgb(${r}, ${g}, ${b})`;
  }
}
