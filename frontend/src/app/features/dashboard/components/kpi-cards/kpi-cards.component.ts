import { Component, Input } from '@angular/core';
import { DashboardStatsDTO } from '../../../../core/models/dashboard.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./kpi-cards.component.scss'],
  templateUrl: './kpi-cards.component.html'
})
export class KpiCardsComponent {
  @Input() stats: DashboardStatsDTO | null = null;
}
