import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatRequestDTO {
  message: string;
}

export interface ChatResponseDTO {
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponseDTO> {
    const payload: ChatRequestDTO = { message };
    return this.http.post<ChatResponseDTO>(this.apiUrl, payload);
  }
}
