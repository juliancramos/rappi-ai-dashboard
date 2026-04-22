# Monitor de Disponibilidad Rappi

Sistema de observabilidad para el monitoreo de visibilidad de tiendas. Combina un pipeline ETL en Python, una API REST en Spring Boot, un agente conversacional fundamentado en LangChain4j + Gemini, y un dashboard analítico en Angular.

---

## 1. Arquitectura General y Stack Tecnológico

El sistema se compone de cuatro módulos independientes con responsabilidades bien definidas:

| Módulo      | Tecnología principal                          | Puerto |
|-------------|-----------------------------------------------|--------|
| ETL         | Python 3, Pandas, sqlite3                     | —      |
| Backend API | Spring Boot 4.0.5, Java 17, SQLite 3.45.1.0  | 8080   |
| Frontend    | Angular 21, Chart.js 4.5.1, TailwindCSS 3.4  | 4200   |
| Agente IA   | LangChain4j 0.36.2, Gemini 2.5 Flash         | —      |

### Dependencias del Backend (`pom.xml`)

- `spring-boot-starter-parent` 4.0.5
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-web`
- `org.xerial:sqlite-jdbc` 3.45.1.0
- `org.hibernate.orm:hibernate-community-dialects` (dialecto `SQLiteDialect`)
- `dev.langchain4j:langchain4j` 0.36.2
- `dev.langchain4j:langchain4j-google-ai-gemini` 0.36.2
- `io.github.cdimascio:dotenv-java` 3.0.0
- `org.projectlombok:lombok` 

### Dependencias del Frontend (`package.json`)

- `@angular/core` ^21.2.0
- `chart.js` ^4.5.1
- `ng2-charts` ^10.0.0
- `tailwindcss` ^3.4.19
- `rxjs` ~7.8.0
- `@angular/ssr` ^21.2.6

### Dependencias del ETL (`requirements.txt`)

- `pandas`
- `sqlalchemy`

---

## 2. Pipeline de Datos (ETL)

### Archivo

El pipeline se implementa en `etl/extract_data.py`. Su ejecución es idempotente: elimina y recrea la tabla `availability_logs` antes de cada carga.

### Esquema de los archivos fuente

Cada uno de los 201 archivos CSV contiene exactamente una fila de datos y un número variable de columnas. Las cuatro primeras son columnas fijas de identidad; el resto son columnas pivote cuyo encabezado es un timestamp en formato JavaScript:

```
Mon Feb 09 2026 15:59:40 GMT-0500 
```

Las columnas fijas reconocidas por alias insensible a mayúsculas:

| Alias en CSV            | Columna |
|-------------------------|------------------|
| `Plot name`, `store_name` | `plot_name`    |
| `metric (sf_metric)`, `metric` | `metric` |
| `Value Prefix`          | `value_prefix`   |
| `Value Suffix`          | `value_suffix`   |

### Función `process_file(filepath)`

1. **Lectura:** `pd.read_csv(filepath, encoding="utf-8", encoding_errors="replace")`. Los errores de codificación se reemplazan, no se propagan.
2. **Resolución de columnas:** `resolve_rename_map()` itera sobre los nombres de columna y los normaliza con `.strip().lower()` para comparar contra los conjuntos de alias.
3. **Melt (wide → long):** `df.melt(id_vars=[...], value_vars=pivot_cols, var_name="raw_timestamp", value_name="status_value")`. Cada columna-timestamp se convierte en una fila independiente. Si un CSV original tiene 345 columnas-pivot, el resultado contiene 345 filas.
4. **Parseo de timestamps:** La función `parse_js_timestamp(raw)` aplica una expresión regular (`_TS_REGEX`) sobre el encabezado de cada columna para extraer mes, día, año y `HH:MM:SS`, convirtiéndolos al formato ISO-8601 `YYYY-MM-DD HH:MM:SS` mediante `datetime.strftime`.
5. **Casteo de `status_value`:** `pd.to_numeric(..., errors="coerce")` seguido de `.astype("Int64")` (entero nullable de Pandas). Los valores no numéricos se almacenan como `NULL`.
6. **Inserción por stream:** `conn.executemany(INSERT_SQL, rows_to_insert)`. Cada archivo se inserta directamente en SQLite sin concatenar DataFrames en memoria.

### Esquema de la tabla `availability_logs`

```sql
CREATE TABLE availability_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    plot_name    TEXT,
    metric       TEXT,
    value_prefix REAL,
    value_suffix REAL,
    timestamp    TEXT,
    status_value INTEGER
);
```

El campo `timestamp` se almacena como `TEXT` en formato `YYYY-MM-DD HH:MM:SS`, compatible con las funciones `strftime` de SQLite. No se crean índices explícitos en el script ETL.

---

## 3. Arquitectura del Backend (Spring Boot)

La estructura de paquetes sigue el siguiente patrón de capas:

```
com.dashboard.backend
├── config/       → AiConfig.java, CorsConfig.java
├── controller/   → DashboardController.java, ChatController.java
├── dto/          → 10 records Java
├── model/        → AvailabilityLog.java
├── repository/   → AvailabilityLogRepository.java
├── service/      → DashboardService.java, AiAssistant.java
└── tool/         → DatabaseTool.java
```

### 3.1 Entidad: `AvailabilityLog`

Anotada con `@Entity` y mapeada a la tabla `availability_logs`. Sus campos:

| Campo        | Tipo Java         | Columna SQL     |
|--------------|-------------------|-----------------|
| `id`         | `Long`            | `id` (PK)       |
| `plotName`   | `String`          | `plot_name`     |
| `metric`     | `String`          | `metric`        |
| `valuePrefix`| `Double`          | `value_prefix`  |
| `valueSuffix`| `Double`          | `value_suffix`  |
| `timestamp`  | `LocalDateTime`   | `timestamp`     |
| `statusValue`| `Long`            | `status_value`  |



### 3.2 DTOs (Records Java)

Todos los Data Transfer Objects se implementan como `record` de Java para garantizar inmutabilidad en la capa de transporte. La lista completa:

| Record                   | Campos                                                        |
|--------------------------|---------------------------------------------------------------|
| `DashboardStatsDTO`      | `double uptimePercentage`, `long peakVisibility`, `long totalCriticalOutages` |
| `HealthDataPointDTO`     | `String hourBucket`, `double avgVisibility`, `long sampleCount` |
| `CriticalIncidentDTO`    | `long id`, `String plotName`, `String metric`, `String timestamp`, `long statusValue` |
| `HourlyPatternDTO`       | `String hourOfDay`, `double averageVisibility`                |
| `HeatmapDataPointDTO`    | `String date`, `String hour`, `double averageVisibility`      |
| `GlobalAvailabilityDTO`  | `double availabilityRate`, `long totalEvents`, `long offlineEvents` |
| `OfflineEventDataPointDTO`| `LocalDateTime timestamp`, `long count`                     |
| `StoreOfflineRankingDTO` | `String storeName`, `long count`                              |
| `ChatRequestDTO`         | `String message`                                              |
| `ChatResponseDTO`        | `String response`                                             |

### 3.3 Capa Repository: `AvailabilityLogRepository`

Extiende `JpaRepository<AvailabilityLog, Long>`.

**Consultas nativas relevantes:**

`findHealthSeriesGroupedByHour()` — agrupa el promedio de visibilidad por bucket de una hora:
```sql
SELECT
    strftime('%Y-%m-%d %H:00', timestamp) AS hour_bucket,
    AVG(status_value)                      AS avg_visibility,
    COUNT(id)                              AS sample_count
FROM   availability_logs
WHERE  timestamp IS NOT NULL
GROUP  BY hour_bucket
ORDER  BY timestamp ASC
```

`findHourlyPatterns()` — promedio global por hora del día (0-23):
```sql
SELECT
    strftime('%H', timestamp) AS hour_of_day,
    AVG(status_value)         AS avg_visibility
FROM   availability_logs
WHERE  timestamp IS NOT NULL
GROUP  BY hour_of_day
ORDER  BY hour_of_day ASC
```

`findIntensityGrid()` — matriz fecha × hora para el heatmap:
```sql
SELECT
    strftime('%Y-%m-%d', timestamp) AS date_val,
    strftime('%H', timestamp)       AS hour_val,
    AVG(status_value)               AS avg_visibility
FROM   availability_logs
WHERE  timestamp IS NOT NULL
GROUP  BY date_val, hour_val
ORDER  BY date_val ASC, hour_val ASC
```

`findCriticalIncidents()` — registros donde `status_value = 0`:
```sql
SELECT id, plot_name, metric, timestamp, status_value
FROM   availability_logs
WHERE  status_value = 0
ORDER  BY timestamp ASC
```

El método `countByStatusValue(Long statusValue)` es generado por Spring Data JPA mediante derivación del nombre del método.

### 3.4 Capa Service: `DashboardService`

Anotada con `@Service`, `@Slf4j` y `@RequiredArgsConstructor`. Cada método público del servicio invoca el repositorio correspondiente, mapea los arreglos `Object[]` retornados por las native queries a sus DTOs, y aplica lógica de negocio:

- **`getSystemHealthStats()`**: calcula `uptimePercentage = ((total - offline) / total) * 100.0` y recupera `peakVisibility` mediante `findMaxStatusValue()`.
- **`getHourlyPatterns()`**: tras invocar `findHourlyPatterns()`, construye un `Map<String, Double>` y lo rellena con `IntStream.range(0, 24)` para garantizar que las 24 horas siempre estén presentes en la respuesta, incluso si no hay datos para algún bucket.
- **`getFullHealthSeries()`**: suma los `sampleCount` para trazabilidad en logs.

### 3.5 Capa Controller: `DashboardController`

Anotado con `@RestController`, `@RequestMapping("/api/dashboard")` y `@CrossOrigin(origins = "*")`. Endpoints expuestos:

| Método | Ruta                              | DTO de respuesta             |
|--------|-----------------------------------|------------------------------|
| GET    | `/api/dashboard/stats`            | `DashboardStatsDTO`          |
| GET    | `/api/dashboard/health-series`    | `List<HealthDataPointDTO>`   |
| GET    | `/api/dashboard/incidents`        | `List<CriticalIncidentDTO>`  |
| GET    | `/api/dashboard/global-availability` | `GlobalAvailabilityDTO`   |
| GET    | `/api/dashboard/offline-series`   | `List<OfflineEventDataPointDTO>` |
| GET    | `/api/dashboard/top-offline-stores` | `List<StoreOfflineRankingDTO>` |
| GET    | `/api/dashboard/analysis/patterns` | `List<HourlyPatternDTO>`    |
| GET    | `/api/dashboard/analysis/intensity-grid` | `List<HeatmapDataPointDTO>` |

---

## 4. Integración de LangChain4j y Agente LLM

### 4.1 Configuración (`AiConfig.java`)

La clase `AiConfig` está anotada con `@Configuration`. Define dos Beans Spring:

**Bean `chatLanguageModel`:** instancia `GoogleAiGeminiChatModel` con el modelo `gemini-2.5-flash`. La clave de API se inyecta desde la variable de entorno `GEMINI_API_KEY` mediante `@Value("${GEMINI_API_KEY}")`. Para cambiar de proveedor (OpenAI, Claude, Mistral) o de versión del modelo, únicamente se modifica la implementación de este Bean sin tocar ninguna otra clase.

**Bean `aiAssistant`:** construye una instancia de `AiAssistant` (interfaz) mediante `AiServices.builder()`, vinculando el `ChatLanguageModel` y el `DatabaseTool` registrado como herramienta disponible para el LLM.

### 4.2 Patrón Tool Use / Function Calling

El flujo de inferencia no utiliza RAG (Retrieval-Augmented Generation). En su lugar, el LLM recibe el contexto del esquema de la tabla `availability_logs` a través de la anotación `@Tool` en `DatabaseTool` y genera consultas SQL dinámicamente:

1. El usuario envía un mensaje al endpoint `/api/chat` (manejado por `ChatController`).
2. LangChain4j entrega el mensaje al modelo Gemini junto con la descripción de la herramienta `executeQuery`.
3. El modelo determina que necesita datos y produce una sentencia `SELECT` orientada al esquema descrito.
4. LangChain4j invoca automáticamente `DatabaseTool.executeQuery(String sqlQuery)` con la sentencia generada.
5. El método ejecuta la consulta con `JdbcTemplate.queryForList()`, formatea los resultados con un límite de 50 filas para controlar el consumo de tokens, y retorna el texto al LLM.
6. El LLM produce la respuesta final en lenguaje natural, que el framework retorna al frontend.

### 4.3 Firewall SQL

Antes de ejecutar cualquier consulta, `DatabaseTool.isQuerySafe(String sqlQuery)` aplica dos validaciones:

1. La cadena normalizada (`.trim().toUpperCase()`) debe comenzar con `SELECT`. Cualquier otro inicio es rechazado.
2. Se evalúa una expresión regular `normalizedQuery.matches(".*\\b" + keyword + "\\b.*")` para cada keyword del conjunto: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `REPLACE`, `CREATE`, `EXEC`, `GRANT`, `REVOKE`. Si alguno se detecta como palabra completa, la ejecución es bloqueada y se retorna un mensaje de error al LLM para que reformule.

Si la consulta pasa el firewall pero falla en ejecución (error de sintaxis SQLite), el bloque `catch (Exception e)` retorna el mensaje de error al LLM.

---

## 5. Arquitectura del Frontend (Angular)

### 5.1 Servicio HTTP: `DashboardService`

Ubicado en `src/app/core/services/dashboard.service.ts`. Inyecta `HttpClient` de Angular y expone métodos tipados que consumen los endpoints del backend:

```typescript
getSystemHealthStats(): Observable<DashboardStatsDTO>
getFullHealthSeries(): Observable<HealthDataPointDTO[]>
getCriticalIncidentLog(): Observable<CriticalIncidentDTO[]>
getHourlyPatterns(): Observable<HourlyPatternDTO[]>
getIntensityGrid(): Observable<HeatmapDataPointDTO[]>
```

Las interfaces TypeScript en `dashboard.model.ts` replican la estructura de los records Java:

```typescript
export interface HourlyPatternDTO {
  hourOfDay: string;
  averageVisibility: number;
}

export interface HeatmapDataPointDTO {
  date: string;
  hour: string;
  averageVisibility: number;
}
```



### 5.2 Componentes del Dashboard

| Selector                  | Archivo                          | Función                                              |
|---------------------------|----------------------------------|------------------------------------------------------|
| `app-kpi-cards`           | `kpi-cards.component.ts`         | Muestra `uptimePercentage`, `peakVisibility`, `totalCriticalOutages` |
| `app-health-chart`        | `health-chart.component.ts`      | Gráfico de área temporal (Chart.js, tipo `line`)     |
| `app-hourly-patterns`     | `hourly-patterns.component.ts`   | Gráfico de barras 24h (Chart.js, tipo `bar`)         |
| `app-intensity-heatmap`   | `intensity-heatmap.component.ts` | Mapa de intensidad (CSS Grid nativo)                 |
| `app-incident-log`        | `incident-log.component.ts`      | Tabla de incidentes críticos (`status_value = 0`)    |
| `app-chatbot`             | `chatbot.component.ts`           | Interfaz conversacional hacia el agente LLM          |

### 5.3 Mapa de Intensidad (`IntensityHeatmapComponent`)

El método `processData()` transforma el array unidimensional `HeatmapDataPointDTO[]` en una matriz bidimensional `matrix: { [date: string]: { [hour: string]: number } }`. Las filas son fechas únicas ordenadas; las columnas son siempre las 24 horas, garantizando que la grilla sea completa incluso sin datos.

La función `getBgColor(date, hour)` calcula el color de cada celda:
- Si no existe valor: `rgb(30, 30, 30)` (negro oscuro = sin datos).
- Si existe valor: `ratio = val / maxVisibility`. Color resultante: `rgb(255 * ratio, 79 * ratio, 0)`, interpolando entre negro y el naranja corporativo `#FF4F00`.




---

## 6. Orquestación y Contenedores (Docker)

### 6.1 Backend Dockerfile (`backend/Dockerfile`)

Proceso de construcción multi-etapa:

- **Etapa `build`**: imagen base `maven:3.9.6-eclipse-temurin-21-alpine`. Empaqueta con `mvn clean package -DskipTests`.
- **Etapa de ejecución**: imagen base `eclipse-temurin:21-jre-alpine`. Copia únicamente el `.jar` generado. Expone el puerto `8080`. La variable de entorno `SPRING_DATASOURCE_URL` se configura como `jdbc:sqlite:/app/data/rappi_logs.db`.

### 6.2 Frontend Dockerfile (`frontend/Dockerfile`)

- **Etapa `build`**: imagen `node:20-alpine`. Ejecuta `npm ci` y `npm run build -- --configuration production`.


**Configuración `nginx.conf`** — manejo de rutas SPA:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
Este bloque garantiza que cualquier ruta de Angular manejada por el router del cliente retorne `index.html` en lugar de un error 404 de Nginx.

### 6.3 Docker Compose (`docker-compose.yml`)

| Propiedad          | Servicio `backend`                     | Servicio `frontend`         |
|--------------------|----------------------------------------|-----------------------------|
| Imagen base final  | `eclipse-temurin:21-jre-alpine`        | `nginx:alpine`              |
| Puerto host:cont.  | `8080:8080`                            | `4200:80`                   |
| Variables de entorno| `./backend/.env` + `SPRING_DATASOURCE_URL` | —                      |
| Volumen            | `./backend:/app/data`                  | —                           |
| Healthcheck        | `wget` sobre `/api/dashboard/stats`    | —                           |
| `depends_on`       | —                                      | `backend: service_healthy`  |

El volumen `./backend:/app/data` mapea el directorio local `backend/` al path `/app/data` dentro del contenedor. Dado que `rappi_logs.db` reside en `backend/`, el archivo es accesible en `/app/data/rappi_logs.db`, que es la URL configurada en `SPRING_DATASOURCE_URL`. El healthcheck verifica que el endpoint `/api/dashboard/stats` retorne HTTP 200 antes de iniciar el frontend (`condition: service_healthy`).

---

## 7. Manual de Ejecución

### Paso 1 — Base de datos

El archivo `rappi_logs.db` generado por el ETL se ubica en `backend/rappi_logs.db`. Esta ruta es la que el volumen de Docker expone al contenedor. Si se requiere regenerar la base de datos desde los archivos fuente:

```bash
cd etl
pip install -r requirements.txt
python extract_data.py
```

### Paso 2 — Variables de entorno

Se requiere un archivo `.env` en el directorio `backend/` con el siguiente contenido:

```
GEMINI_API_KEY=valor_de_la_llave_de_api
```

Este archivo es cargado por `env_file: ./backend/.env` en `docker-compose.yml`. La clave no se incluye en el código fuente ni en las imágenes Docker por seguridad.

### Paso 3 — Construcción y ejecución

Desde la raíz del proyecto:

```bash
docker-compose up -d --build
```


### Paso 4 — Puntos de acceso

| Servicio              | URL                              |
|-----------------------|----------------------------------|
| Frontend (Angular)    | http://localhost:4200            |
| Backend API REST      | http://localhost:8080            |

### Detener los contenedores

```bash
docker-compose down
```

Los datos persisten en `backend/rappi_logs.db` independientemente del ciclo de vida de los contenedores.
