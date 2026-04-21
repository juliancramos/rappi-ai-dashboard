import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineChartComponent } from './features/dashboard/components/offline-chart/offline-chart.component';
import { TopStoresTableComponent } from './features/dashboard/components/top-stores-table/top-stores-table.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OfflineChartComponent, TopStoresTableComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'frontend';
}
