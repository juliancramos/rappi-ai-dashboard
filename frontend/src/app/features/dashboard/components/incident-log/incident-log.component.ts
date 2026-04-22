import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CriticalIncidentDTO } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-incident-log',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./incident-log.component.scss'],
  templateUrl: './incident-log.component.html'
})
export class IncidentLogComponent {
  @Input() incidents: CriticalIncidentDTO[] = [];
}
