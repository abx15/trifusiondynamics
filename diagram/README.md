# Trifusion-Dynamics: Architecture Diagrams

This folder contains the complete architecture diagrams for each phase of **Trifusion-Dynamics (AgencyOS)**. These diagrams show the evolution of the database schemas, entity relationships, and module integrations.

---

## 1. Project Structure Overview

This diagram represents how the different apps and services in the monorepo workspace communicate with the database and with each other.

```mermaid
graph TD
    subgraph Packages
        DB["@agency-os/database<br>(Prisma + Neon PostgreSQL + MongoClient)"]
        TYPES["@agency-os/types<br>(Shared TypeScript interfaces)"]
        UI["@agency-os/ui<br>(Shared UI components)"]
        CONFIG["@agency-os/config<br>(Workspace tsconfig.json)"]
    end

    subgraph Services
        AUTH["services/auth<br>(NestJS Backend API)"]
    end

    subgraph Applications
        WEB["apps/agency-web<br>(Public Website - Next.js)"]
        DASHBOARD["apps/admin-dashboard<br>(Admin Portal - Next.js)"]
    end

    AUTH -->|Imports| DB
    AUTH -->|Imports| TYPES
    DASHBOARD -->|API Requests| AUTH
    DASHBOARD -->|Imports| UI
    DASHBOARD -->|Imports| TYPES
    WEB -->|API Requests| AUTH
```

---

## 2. Complete Database Schema (Unified ER Diagram)

This diagram shows how all schemas (`auth`, `cms`, `clients`, `crm`, `projects`) relate to each other. Relations across different schemas are indicated.

```mermaid
erDiagram
    %% Auth Schema
    Organization {
        String id PK
        String name
        String slug UK
        DateTime createdAt
        DateTime updatedAt
    }
    User {
        String id PK
        String email UK
        String password
        String name
        Boolean isActive
        String organizationId FK
        DateTime createdAt
        DateTime updatedAt
    }
    Role {
        String id PK
        String name UK
        String description
    }
    Permission {
        String id PK
        String action UK
    }
    RolePermission {
        String roleId PK,FK
        String permissionId PK,FK
    }
    UserRole {
        String userId PK,FK
        String roleId PK,FK
    }
    RefreshToken {
        String id PK
        String token UK
        String userId FK
        DateTime expiresAt
        Boolean revoked
        DateTime createdAt
    }

    %% CMS Schema
    ContactSubmission {
        String id PK
        String name
        String email
        String message
        String status
        String organizationId FK
        DateTime createdAt
    }

    %% Clients Schema
    Client {
        String id PK
        String name
        String companyName
        String email
        String phone
        String address
        String gstNumber
        ClientStatus status
        String organizationId FK
        String leadId FK "Links to original Lead"
        DateTime createdAt
        DateTime updatedAt
    }
    ClientContact {
        String id PK
        String clientId FK
        String name
        String role
        String email
        String phone
        Boolean isPrimary
        DateTime createdAt
    }

    %% CRM Schema
    Lead {
        String id PK
        String name
        String email
        String phone
        String companyName
        LeadSource source
        PipelineStage stage
        Decimal estimatedValue
        String notes
        String assignedToId FK "References auth.User"
        String organizationId FK
        String convertedToClientId FK "References clients.Client"
        DateTime createdAt
        DateTime updatedAt
    }
    FollowUp {
        String id PK
        String leadId FK
        String note
        DateTime scheduledAt
        DateTime completedAt
        String createdById FK "References auth.User"
        DateTime createdAt
    }
    Quote {
        String id PK
        String leadId FK "References crm.Lead"
        String clientId FK "References clients.Client"
        String title
        Json items
        Decimal totalAmount
        QuoteStatus status
        DateTime validUntil
        String organizationId FK
        DateTime createdAt
        DateTime updatedAt
    }

    %% Projects Schema
    Project {
        String id PK
        String name
        String description
        String clientId FK "References clients.Client"
        ProjectStatus status
        DateTime startDate
        DateTime endDate
        Decimal budget
        String organizationId FK
        DateTime createdAt
        DateTime updatedAt
    }
    ProjectMember {
        String id PK
        String projectId FK
        String userId FK "References auth.User"
        String role
        DateTime addedAt
    }
    Milestone {
        String id PK
        String projectId FK
        String title
        DateTime dueDate
        Boolean isCompleted
        DateTime completedAt
        DateTime createdAt
    }
    Task {
        String id PK
        String projectId FK
        String title
        String description
        TaskStatus status
        TaskPriority priority
        String assignedToId FK "References auth.User"
        DateTime dueDate
        String sprintId FK
        Int order
        DateTime createdAt
        DateTime updatedAt
    }
    Sprint {
        String id PK
        String projectId FK
        String name
        DateTime startDate
        DateTime endDate
        Boolean isActive
        DateTime createdAt
    }
    TimeLog {
        String id PK
        String taskId FK
        String userId FK "References auth.User"
        Int minutes
        String note
        DateTime loggedAt
    }

    %% Relationships
    Organization ||--o{ User : "has"
    User ||--o{ UserRole : "has"
    Role ||--o{ UserRole : "assigns"
    Role ||--o{ RolePermission : "defines"
    Permission ||--o{ RolePermission : "linked"
    User ||--o{ RefreshToken : "holds"
    
    Organization ||--o{ ContactSubmission : "owns"
    Organization ||--o{ Client : "owns"
    Organization ||--o{ Lead : "owns"
    Organization ||--o{ Project : "owns"

    Client ||--o{ ClientContact : "has"
    Lead ||--o{ FollowUp : "tracks"
    User ||--o{ Lead : "assignee"
    User ||--o{ FollowUp : "creator"
    
    Lead |o--|| Client : "converts_to"
    Lead ||--o{ Quote : "linked"
    Client ||--o{ Quote : "linked"

    Client ||--o{ Project : "owns"
    Project ||--o{ ProjectMember : "has_team"
    User ||--o{ ProjectMember : "member_user"
    Project ||--o{ Milestone : "tracks_milestones"
    Project ||--o{ Sprint : "groups_tasks"
    Project ||--o{ Task : "contains"
    Sprint ||--o{ Task : "sprint_tasks"
    Task ||--o{ TimeLog : "tracks_logs"
    User ||--o{ TimeLog : "logs_time"
```

---

## 3. Individual Schema Breakdowns

### Schema: `auth`
Manages users, organizations, refresh tokens, roles, and permissions (RBAC).
- `Organization`: The tenant boundary.
- `User`: Accounts associated with organizations.
- `Role` & `Permission`: Controls route and action access (e.g. `admin`, `employee`, `client`).
- `RefreshToken`: Handles long-lived user sessions.

### Schema: `clients`
Manages post-acquisition client companies and their stakeholders.
- `Client`: Client organizations with invoice details.
- `ClientContact`: Specific points of contact within the client organization.

### Schema: `crm`
Tracks sales opportunities and leads progression.
- `Lead`: Prospects from different sources (Website, Upwork, Fiverr, etc.).
- `FollowUp`: Sales call notes and reminders.
- `Quote`: Estimates and pricing drafts sent to leads or clients.

### Schema: `projects`
Tracks development milestones, sprints, tasks, and time tracked.
- `Project`: Core development work blocks.
- `ProjectMember`: Assigns internal employees to client projects.
- `Milestone`: Highlights key project delivery checkpoints.
- `Sprint`: Development cycles (typically 2 weeks).
- `Task`: Individual action items (TODO, IN_PROGRESS, DONE).
- `TimeLog`: Tracks developer work hours on tasks (in minutes).
