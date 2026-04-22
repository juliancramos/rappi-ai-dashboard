# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies for offline use
RUN mvn dependency:go-offline -B
COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Expose port and configure environment
EXPOSE 8080
ENV GEMINI_API_KEY=""
ENV SPRING_DATASOURCE_URL="jdbc:sqlite:/app/data/rappi_logs.db"

ENTRYPOINT ["java", "-jar", "app.jar"]
