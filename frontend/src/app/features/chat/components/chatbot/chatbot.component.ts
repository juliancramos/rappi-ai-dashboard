import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../core/services/chat.service';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  `],
  template: `
    <!-- Sidebar Header -->
    <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
      <div class="w-9 h-9 rounded-xl bg-rappi-500 flex items-center justify-center shadow-sm flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>
      <div>
        <p class="font-semibold text-sm text-gray-900 leading-tight">Asistente IA Rappi</p>
        <p class="text-xs text-gray-400 mt-0.5">Powered by Gemini</p>
      </div>
    </div>

    <!-- Message History — fills all available space -->
    <div
      #messageContainer
      class="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gray-50/60"
    >
      <!-- Empty State -->
      <div *ngIf="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
        <div class="w-16 h-16 rounded-2xl bg-rappi-50 border border-rappi-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rappi-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-gray-700">¿Tienes alguna pregunta?</p>
          <p class="text-xs text-gray-400 mt-1 leading-relaxed">Pregúntame sobre la disponibilidad, intermitencias o el rendimiento de las tiendas Rappi.</p>
        </div>
        <!-- Example prompts -->
        <div class="flex flex-col gap-3 w-full mt-2">
          <button
            *ngFor="let prompt of examplePrompts"
            (click)="usePrompt(prompt)"
            class="text-left text-sm font-medium text-gray-500 border border-gray-200 bg-white hover:border-[#FF4F00] hover:text-[#FF4F00] rounded-xl px-4 py-3 transition-colors cursor-pointer"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <ng-container *ngIf="messages.length > 0">
        <div
          *ngFor="let msg of messages"
          class="flex gap-2"
          [class.flex-row-reverse]="msg.role === 'user'"
        >
          <!-- Bot Avatar -->
          <div
            *ngIf="msg.role === 'bot'"
            class="w-7 h-7 rounded-lg bg-rappi-500 flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>

          <!-- Bubble -->
          <div
            class="max-w-[85%] px-5 py-4 rounded-2xl text-lg leading-relaxed shadow-sm"
            [ngClass]="{
              'bg-[#FF4F00] text-white rounded-tr-sm': msg.role === 'user',
              'bg-white text-gray-900 rounded-tl-sm border border-gray-200': msg.role === 'bot'
            }"
          >
            {{ msg.content }}
          </div>
        </div>

        <!-- Thinking / Typing Indicator -->
        <div *ngIf="isThinking" class="flex gap-2 items-center">
          <div class="w-7 h-7 rounded-lg bg-rappi-500 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div class="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1.5 items-center">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0s"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0.15s"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0.3s"></span>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Input Area — pinned to bottom -->
    <div class="flex-shrink-0 px-6 py-5 border-t border-gray-200 bg-white shadow-md z-10 relative">
      <form (ngSubmit)="sendMessage()" class="flex items-center gap-4">
        <input
          id="chat-input"
          [(ngModel)]="inputMessage"
          name="inputMessage"
          type="text"
          placeholder="Pregunta sobre las tiendas..."
          [disabled]="isThinking"
          autocomplete="off"
          class="flex-1 text-lg px-5 py-4 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/40 focus:border-[#FF4F00] transition-all placeholder-gray-400 disabled:opacity-60 text-gray-900"
        />
        <button
          id="chat-send-btn"
          type="submit"
          [disabled]="isThinking || !inputMessage.trim()"
          class="flex-shrink-0 w-14 h-14 rounded-xl bg-[#FF4F00] text-white flex items-center justify-center hover:bg-[#E64600] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 shadow-sm"
          aria-label="Enviar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  `
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isThinking = false;
  inputMessage = '';
  messages: ChatMessage[] = [];

  examplePrompts = [
    '¿Cuáles son las 5 tiendas con más eventos offline?',
    '¿Cuántos eventos offline ocurrieron en total?',
    '¿Cuál es la tasa de disponibilidad global?',
  ];

  constructor(private chatService: ChatService) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  usePrompt(prompt: string): void {
    this.inputMessage = prompt;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.inputMessage.trim();
    if (!text || this.isThinking) return;

    this.messages.push({ role: 'user', content: text });
    this.inputMessage = '';
    this.isThinking = true;

    this.chatService.sendMessage(text).subscribe({
      next: (res) => {
        this.messages.push({ role: 'bot', content: res.response });
        this.isThinking = false;
      },
      error: () => {
        this.messages.push({ role: 'bot', content: 'Error de conexión. Intenta de nuevo.' });
        this.isThinking = false;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch { /* ignore */ }
  }
}
