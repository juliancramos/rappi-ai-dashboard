package com.dashboard.backend.controller;

import com.dashboard.backend.dto.ChatRequestDTO;
import com.dashboard.backend.dto.ChatResponseDTO;
import com.dashboard.backend.service.AiAssistant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final AiAssistant aiAssistant;

    @PostMapping
    public ResponseEntity<ChatResponseDTO> chat(@RequestBody ChatRequestDTO request) {
        log.info("Received AI chat message from client: {}", request.message());
        
        try {
            String aiResponse = aiAssistant.chat(request.message());
            log.info("Successfully generated AI response.");
            return ResponseEntity.ok(new ChatResponseDTO(aiResponse));
        } catch (Exception e) {
            log.error("AI service failure during chat generation: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(new ChatResponseDTO("Error interno del servidor. Por favor, inténtelo de nuevo más tarde."));
        }
    }
}
