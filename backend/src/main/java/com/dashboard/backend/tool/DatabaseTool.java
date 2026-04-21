package com.dashboard.backend.tool;

import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseTool {

    private final JdbcTemplate jdbcTemplate;

    @Tool("Executes a SQL SELECT query against the SQLite database and returns the result data. The active SQLite table is called 'availability_logs' and contains fields: 'id', 'plot_name', 'metric', 'value_prefix', 'value_suffix', 'timestamp', 'status_value'. Returns query results as formatted text, or an error description if the query format fails so you can correct it.")
    public String executeQuery(String sqlQuery) {
        log.info("LLM requested execution of query: {}", sqlQuery);

        if (!isQuerySafe(sqlQuery)) {
            log.error("Security enforcement blocked unsafe SQL execution.");
            return "ERROR: Query execution blocked. Only SELECT statements are permitted. Sub-queries modifying the database or destructive keywords are forbidden.";
        }

        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sqlQuery);
            return formatResults(results);
        } catch (Exception e) {
            log.warn("Query execution failed: {}", e.getMessage());
            return "ERROR executing query: " + e.getMessage() + ". Please analyze the syntax and retry with a valid SQLite SELECT statement.";
        }
    }

    private boolean isQuerySafe(String sqlQuery) {
        if (sqlQuery == null || sqlQuery.trim().isEmpty()) {
            return false;
        }

        String normalizedQuery = sqlQuery.trim().toUpperCase();

        if (!normalizedQuery.startsWith("SELECT")) {
            return false;
        }

        // Extremely restrictive pattern matching to block any injection attempting to terminate the select and start a modification
        String[] restrictedKeywords = {
                "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "REPLACE", "CREATE", "EXEC", "GRANT", "REVOKE"
        };

        for (String keyword : restrictedKeywords) {
            // Using boundaries matching to prevent false positives like matching "DROP" inside a string, but for safety against LLM hallucinations, broad blocking is sufficient here.
            // Using regex to check for the keyword as a standalone word
            if (normalizedQuery.matches(".*\\b" + keyword + "\\b.*")) {
                return false;
            }
        }

        return true;
    }

    private String formatResults(List<Map<String, Object>> results) {
        if (results == null || results.isEmpty()) {
            return "Query executed successfully. Result set is empty (0 rows returned).";
        }

        // Protect LLM token limits by enforcing a hard return ceiling on unpaginated queries
        int maxRows = 50;
        boolean truncated = results.size() > maxRows;
        
        List<Map<String, Object>> limitedResults = results.stream().limit(maxRows).toList();

        StringBuilder formattedOutput = new StringBuilder();
        formattedOutput.append("Query executed successfully. Fetched ").append(results.size()).append(" rows.\n\n");

        if (truncated) {
            formattedOutput.append("(Note: Displaying only the first ").append(maxRows).append(" rows to conserve context token limits)\n");
        }

        for (int i = 0; i < limitedResults.size(); i++) {
            Map<String, Object> row = limitedResults.get(i);
            formattedOutput.append("Row ").append(i + 1).append(": \n");
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                formattedOutput.append("  - ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
            formattedOutput.append("\n");
        }

        return formattedOutput.toString();
    }
}
