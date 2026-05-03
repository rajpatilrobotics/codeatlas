# 03 - Data Flow Architecture

## System Data Flow and Sequence Diagrams

This document illustrates how data flows through the DevDock system, from user input to final output.

## Complete Data Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant React as React Frontend
    participant GHService as GitHub Service
    participant GitHub as GitHub API
    participant Express as Express Server
    participant IAM as IBM IAM
    participant WatsonX as watsonx.ai
    
    User->>React: Enter GitHub URL
    React->>GHService: analyzeRepository(url)
    
    par Parallel Data Fetching
        GHService->>GitHub: Fetch Repo Info
        GitHub-->>GHService: Repo Metadata
        
        GHService->>GitHub: Fetch File Tree
        GitHub-->>GHService: File Structure
        
        GHService->>GitHub: Fetch README
        GitHub-->>GHService: README Content
        
        GHService->>GitHub: Fetch Contributors
        GitHub-->>GHService: Contributor Data
    end
    
    GHService->>GHService: Detect Tech Stack
    GHService->>GHService: Analyze Architecture
    GHService->>GHService: Calculate Complexity
    GHService-->>React: Repository Analysis Data
    
    React->>Express: POST /api/watsonx/generate
    Express->>IAM: Request Access Token
    IAM-->>Express: Access Token (Cached)
    Express->>WatsonX: Generate AI Summary
    WatsonX-->>Express: Generated Text
    Express-->>React: AI Response
    
    React->>React: Render Tabs with Data
    React->>User: Display Analysis Results
    
    User->>React: Ask Question in Chat
    React->>Express: POST /api/watsonx/generate
    Express->>WatsonX: Generate Response
    WatsonX-->>Express: AI Answer
    Express-->>React: Chat Response
    React->>User: Display Answer
```

## Repository Analysis Flow

```mermaid
graph TD
    Start[User Enters URL] --> Parse[Parse GitHub URL]
    Parse --> Validate{Valid URL?}
    Validate -->|No| Error[Show Error Message]
    Validate -->|Yes| Fetch[Fetch Repository Data]
    
    Fetch --> Parallel{Parallel Operations}
    
    Parallel --> RepoInfo[Fetch Repo Info<br/>Name, Stars, Language]
    Parallel --> FileTree[Fetch File Tree<br/>Directory Structure]
    Parallel --> README[Fetch README<br/>Documentation]
    Parallel --> Contributors[Fetch Contributors<br/>Commit Activity]
    
    RepoInfo --> Analyze[Analyze Repository]
    FileTree --> Analyze
    README --> Analyze
    Contributors --> Analyze
    
    Analyze --> TechStack[Detect Tech Stack<br/>50+ Technologies]
    Analyze --> Architecture[Analyze Architecture<br/>Patterns & Structure]
    Analyze --> Complexity[Calculate Complexity<br/>Scoring Algorithm]
    Analyze --> Security[Security Scan<br/>Vulnerabilities]
    
    TechStack --> Combine[Combine Results]
    Architecture --> Combine
    Complexity --> Combine
    Security --> Combine
    
    Combine --> Display[Display in UI]
    
    style Start fill:#4A90E2
    style Parallel fill:#FFD700
    style Combine fill:#50C878
    style Display fill:#FF6B6B
```

## AI Generation Flow

```mermaid
graph LR
    subgraph "Frontend"
        Input[User Input/<br/>Repository Data]
        Prompt[Prepare Prompt]
        Display[Display Result]
    end
    
    subgraph "Express Proxy"
        Receive[Receive Request]
        CheckCache{Token<br/>Cached?}
        GetToken[Get IAM Token]
        Cache[Cache Token]
        Forward[Forward to watsonx]
    end
    
    subgraph "IBM Services"
        IAM[IBM IAM<br/>Authentication]
        WatsonX[watsonx.ai<br/>Granite Model]
    end
    
    Input --> Prompt
    Prompt -->|POST /api/watsonx/generate| Receive
    Receive --> CheckCache
    CheckCache -->|No| GetToken
    GetToken --> IAM
    IAM --> Cache
    CheckCache -->|Yes| Forward
    Cache --> Forward
    Forward --> WatsonX
    WatsonX -->|Generated Text| Forward
    Forward -->|JSON Response| Display
    
    style Input fill:#4A90E2
    style WatsonX fill:#FF6B6B
    style Cache fill:#50C878
```

## Chat Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant ChatUI as Chat Component
    participant Cache as Response Cache
    participant WXService as Watsonx Service
    participant Express as Express Server
    participant WatsonX as watsonx.ai
    
    User->>ChatUI: Type Question
    ChatUI->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>ChatUI: Return Cached Response
        ChatUI-->>User: Display Answer (Instant)
    else Cache Miss
        ChatUI->>WXService: generateText(question)
        WXService->>Express: POST /api/watsonx/generate
        Express->>WatsonX: Generate Response
        WatsonX-->>Express: AI Answer
        Express-->>WXService: JSON Response
        WXService-->>ChatUI: Generated Text
        ChatUI->>Cache: Store Response
        ChatUI-->>User: Display Answer
    end
    
    User->>ChatUI: Ask Follow-up
    Note over ChatUI,Cache: Process repeats with context
```

## PDF Generation Flow

```mermaid
graph TD
    Start[User Clicks Download PDF] --> Gather[Gather All Data]
    
    Gather --> RepoData[Repository Data]
    Gather --> AIData[AI Summaries]
    Gather --> ArchData[Architecture Analysis]
    Gather --> SecData[Security Scan Results]
    
    RepoData --> Process[Process Data]
    AIData --> Process
    ArchData --> Process
    SecData --> Process
    
    Process --> CreatePDF[Create PDF Document]
    
    CreatePDF --> Header[Add Header & Logo]
    Header --> TOC[Generate Table of Contents]
    TOC --> Sections[Add Sections]
    
    Sections --> S1[1. Repository Overview]
    Sections --> S2[2. AI Summary]
    Sections --> S3[3. Architecture]
    Sections --> S4[4. Quick Start]
    Sections --> S5[5. Security Analysis]
    Sections --> S6[6. Onboarding Guide]
    
    S1 --> Format[Format & Style]
    S2 --> Format
    S3 --> Format
    S4 --> Format
    S5 --> Format
    S6 --> Format
    
    Format --> Download[Download PDF]
    
    style Start fill:#4A90E2
    style Process fill:#FFD700
    style Download fill:#50C878
```

## Data Transformation Pipeline

```mermaid
graph LR
    subgraph "Raw Data"
        GH[GitHub API<br/>JSON Response]
        Files[File Contents<br/>Base64 Encoded]
    end
    
    subgraph "Processing"
        Parse[Parse & Decode]
        Extract[Extract Patterns]
        Analyze[Analyze Structure]
        Detect[Detect Technologies]
    end
    
    subgraph "AI Enhancement"
        Prepare[Prepare Prompts]
        Generate[Generate Insights]
        Clean[Clean Output]
    end
    
    subgraph "Presentation"
        Format[Format for Display]
        Render[Render Components]
        Export[Export Options]
    end
    
    GH --> Parse
    Files --> Parse
    Parse --> Extract
    Extract --> Analyze
    Analyze --> Detect
    
    Detect --> Prepare
    Prepare --> Generate
    Generate --> Clean
    
    Clean --> Format
    Format --> Render
    Render --> Export
    
    style GH fill:#333
    style Generate fill:#FF6B6B
    style Render fill:#4A90E2
```

## State Update Flow

```mermaid
graph TD
    Action[User Action] --> Handler[Event Handler]
    Handler --> Service[Service Call]
    
    Service --> API{API Type}
    
    API -->|GitHub| GHCall[GitHub API Call]
    API -->|Watsonx| WXCall[Watsonx API Call]
    
    GHCall --> GHResponse[Process Response]
    WXCall --> WXResponse[Process Response]
    
    GHResponse --> Update[Update State]
    WXResponse --> Update
    
    Update --> SetState[setState()]
    SetState --> Rerender[Component Re-render]
    Rerender --> UI[Update UI]
    
    UI --> User[User Sees Update]
    
    style Action fill:#4A90E2
    style Update fill:#FFD700
    style User fill:#50C878
```

## Error Handling Flow

```mermaid
graph TD
    Operation[API Operation] --> Try{Try}
    
    Try -->|Success| Process[Process Data]
    Try -->|Error| Catch[Catch Error]
    
    Catch --> Type{Error Type}
    
    Type -->|Network| Network[Network Error<br/>Retry Logic]
    Type -->|Auth| Auth[Auth Error<br/>Clear Token Cache]
    Type -->|Validation| Valid[Validation Error<br/>Show User Message]
    Type -->|Unknown| Unknown[Unknown Error<br/>Log & Report]
    
    Network --> Retry{Retry?}
    Retry -->|Yes| Operation
    Retry -->|No| Display
    
    Auth --> Display[Display Error]
    Valid --> Display
    Unknown --> Display
    
    Process --> Success[Success State]
    Display --> Error[Error State]
    
    Success --> UI[Update UI]
    Error --> UI
    
    style Try fill:#4A90E2
    style Catch fill:#FF6B6B
    style Success fill:#50C878
```

## Caching Strategy Flow

```mermaid
graph LR
    subgraph "Request Flow"
        Request[API Request]
        CheckCache{Cache<br/>Valid?}
        FetchAPI[Fetch from API]
        StoreCache[Store in Cache]
        Return[Return Data]
    end
    
    subgraph "Cache Layers"
        TokenCache[Token Cache<br/>5min buffer]
        FileCache[File Cache<br/>1hr TTL]
        AnalysisCache[Analysis Cache<br/>1hr TTL]
        ChatCache[Chat Cache<br/>1hr TTL]
    end
    
    Request --> CheckCache
    CheckCache -->|Hit| Return
    CheckCache -->|Miss| FetchAPI
    FetchAPI --> StoreCache
    
    StoreCache -.-> TokenCache
    StoreCache -.-> FileCache
    StoreCache -.-> AnalysisCache
    StoreCache -.-> ChatCache
    
    StoreCache --> Return
    
    style CheckCache fill:#FFD700
    style Return fill:#50C878
    style TokenCache fill:#4A90E2
```

## Real-time Update Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant State as App State
    participant Service as Service Layer
    participant API as External API
    
    User->>UI: Trigger Action
    UI->>State: Update Loading State
    State-->>UI: Re-render (Loading)
    
    UI->>Service: Call Service Method
    Service->>API: API Request
    
    loop Progress Updates
        API-->>Service: Partial Data
        Service-->>State: Update State
        State-->>UI: Re-render (Progress)
    end
    
    API-->>Service: Complete Data
    Service-->>State: Final Update
    State-->>UI: Re-render (Complete)
    UI-->>User: Show Results
```

## Key Data Flow Patterns

### 1. **Parallel Fetching**
- Multiple GitHub API calls simultaneously
- Reduces total loading time
- Improves user experience

### 2. **Progressive Enhancement**
- Display data as it becomes available
- Show loading states for pending data
- Graceful degradation on errors

### 3. **Optimistic Updates**
- Update UI immediately
- Revert on error
- Better perceived performance

### 4. **Lazy Loading**
- Load tab content on demand
- Reduce initial bundle size
- Faster initial page load

### 5. **Caching Strategy**
- Multi-layer caching
- TTL-based expiration
- LRU eviction policy

---

**Previous**: [02 - Component Architecture](./02_Component_Architecture.md)  
**Next**: [04 - Service Layer Architecture](./04_Service_Layer_Architecture.md)