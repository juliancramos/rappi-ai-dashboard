import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatbotComponent } from './features/chat/components/chatbot/chatbot.component';
import { KpiCardsComponent } from './features/dashboard/components/kpi-cards/kpi-cards.component';
import { HealthChartComponent } from './features/dashboard/components/health-chart/health-chart.component';
import { IncidentLogComponent } from './features/dashboard/components/incident-log/incident-log.component';
import { DashboardService } from './core/services/dashboard.service';
import { DashboardStatsDTO, HealthDataPointDTO, CriticalIncidentDTO } from './core/models/dashboard.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    ChatbotComponent,
    KpiCardsComponent,
    HealthChartComponent,
    IncidentLogComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  stats: DashboardStatsDTO | null = null;
  healthSeries: HealthDataPointDTO[] = [];
  incidents: CriticalIncidentDTO[] = [];
  private destroy$ = new Subject<void>();

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getSystemHealthStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.stats = data);

    this.dashboardService.getFullHealthSeries()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.healthSeries = data);

    this.dashboardService.getCriticalIncidentLog()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.incidents = data);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
