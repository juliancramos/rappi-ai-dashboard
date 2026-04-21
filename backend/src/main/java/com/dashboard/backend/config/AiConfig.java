package com.dashboard.backend.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class AiConfig {

    @Value("${GEMINI_API_KEY}")
    private String apiKey;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName("gemini-2.5-flash")
                .build();
    }

    @Bean
    public com.dashboard.backend.service.AiAssistant aiAssistant(ChatLanguageModel chatLanguageModel, com.dashboard.backend.tool.DatabaseTool databaseTool) {
        return dev.langchain4j.service.AiServices.builder(com.dashboard.backend.service.AiAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .tools(databaseTool)
                .build();
    }

    @PostConstruct
    public void validateModelInitialization() {
        log.info("Gemini Model initialized successfully.");
    }
}
