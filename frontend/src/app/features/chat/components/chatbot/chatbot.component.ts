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
  styleUrls: ['./chatbot.component.scss'],
  templateUrl: './chatbot.component.html'
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

  constructor(private chatService: ChatService) { }

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
