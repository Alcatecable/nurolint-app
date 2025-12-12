# NeuroLint App

## CRITICAL: Database & Backend Configuration

**THIS PROJECT USES SUPABASE EXCLUSIVELY. DO NOT MIGRATE TO REPLIT DB OR ANY OTHER DATABASE.**

When importing or setting up this project:
1. **NEVER** attempt to migrate to Replit's built-in PostgreSQL database
2. **NEVER** set up Drizzle ORM or any other ORM to replace Supabase
3. **ALWAYS** ask the user for Supabase credentials first:
   - `NEXT_PUBLIC_SUPABASE_URL` (required)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, for server-side operations)

The database schema is managed via Supabase migrations in `/supabase/migrations/`.

## Overview

NeuroLint is a rule-based React/Next.js code transformation engine that provides automated code fixes through an **8-layer analysis system**. The application is built on Next.js 15 with TypeScript, utilizing **Supabase** (PostgreSQL with Row-Level Security) for data persistence and authentication. It offers a freemium SaaS model with tiered access to code transformation capabilities, team collaboration features, and CI/CD integrations.

The platform analyzes React/Next.js codebases and automatically fixes issues related to accessibility, hydration, patterns, security, and configurations with 95% accuracy using deterministic rule-based transformations (not AI-based pattern matching).

## Enterprise Roadmap

See **[roadmap.md](./roadmap.md)** for the comprehensive plan to achieve enterprise acquisition readiness with:
- Shared-core integration from the CLI (`@neurolint/cli` on npm)
- Layer 8 Security Forensics (CVE detection, IoC scanning)
- Auto PR fixing-as-a-service
- CI/CD integrations (GitHub Actions, GitLab, Vercel)
- Developer extensions (VS Code, Cursor, JetBrains)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14.2.5 with App Router architecture
- **Rendering Strategy**: Force dynamic rendering (`export const dynamic = 'force-dynamic'`) to avoid SSR context issues
- **Styling**: Tailwind CSS with custom design system defined in `globals.css` and `design-system.css`
- **State Management**: React Context API for authentication state (`AuthProvider`)
- **UI Components**: Custom component library with production-ready modals, toasts, and error boundaries
- **Client-Side Navigation**: Next.js App Router with programmatic navigation via `useRouter`

**Key Design Patterns**:
- Error boundaries at multiple levels (global, page-level, external service-specific)
- Conditional auth wrapper to skip authentication on public pages (e.g., `/docs`)
- Accessibility provider for WCAG compliance
- No SSR wrapper component to handle client-only rendering where needed

### Backend Architecture

**Primary Database**: Supabase (PostgreSQL)
- Row-Level Security (RLS) policies for data isolation
- Schema includes: profiles, projects, teams, collaboration sessions, billing, webhooks, integrations
- Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables

**Authentication**: Supabase Auth
- Email/password authentication
- JWT-based session management
- Token refresh handling with error recovery

**In-Memory Data Store**: Fallback/development mode using `lib/data-store.ts`
- Maps for various entities (projects, teams, API keys, webhooks, etc.)
- Used when Supabase is not configured or in demo mode

**API Layer**:
- Next.js API routes in `/app/api/`
- RESTful endpoints for all major features
- Authentication middleware with rate limiting
- Tier-based access control (free, premium, enterprise)

### Authentication & Authorization

**Provider**: Supabase Auth
- Email/password authentication
- JWT-based session management
- Token refresh handling with error recovery
- Email confirmation flow (optional enforcement)

**Access Control**:
- Tier-based feature gating (free, premium, enterprise, migration tiers)
- API key authentication for programmatic access
- Rate limiting per tier (requests per hour/day)
- Row-level security in database

**Error Handling**:
- Auth-specific error boundary (`AuthErrorBoundary`)
- Global error handler for expired tokens
- Automatic session cleanup for invalid states
- Client-side auth state validation

### Core Analysis Engine

**7-Layer Transformation System** (defined in `code/neurolint-pro-enhanced.js`):
1. **Layer 1 - Configuration**: Foundation setup, config file modernization
2. **Layer 2 - Entity Cleanup**: Pattern cleanup and preprocessing
3. **Layer 3 - Components**: React component fixes and improvements
4. **Layer 4 - Hydration**: SSR safety and hydration fixes
5. **Layer 5 - Next.js**: Next.js App Router compatibility
6. **Layer 6 - Testing**: Test suite updates
7. **Layer 7** (implied): Advanced transformations

**Execution Principles**:
- Layers execute sequentially (dependencies: Layer N requires 1→N-1)
- Each layer builds on previous transformations
- Incremental validation after each layer
- Safe rollback on failures

**AST Engine**:
- Babel parser for JavaScript/TypeScript/JSX
- Enhanced semantic analysis (`lib/enhanced-ast-engine.js`)
- Type-aware transformations (`lib/type-aware-transforms`)
- Component relationship analysis
- Next.js-specific intelligence for App Router patterns

### Collaboration System

**Real-Time Features**:
- WebSocket-based live code editing (`lib/collaboration-server.js`)
- Operational transform system for concurrent edits
- User presence tracking with live cursors
- Comment threads on specific code lines
- Session-based collaboration with participant management

**Team Management**:
- Team creation and member management
- Role-based permissions (owner, admin, member)
- Team invitations with email notifications
- Shared project access within teams

### Billing & Subscription System

**Tier Structure**:
- **Free**: Basic analysis, preview mode, limited API calls
- **Premium**: Full layer access, increased limits, priority support
- **Enterprise**: Unlimited usage, custom rules, dedicated support
- **Migration**: One-time service ($999-$9,999) for full codebase migrations

**Pay-Per-Fix Model**:
- Project-based subscriptions
- Usage tracking per project (fix history)
- Monthly billing cycles
- Detailed fix history and audit logs

**Integration**: PayPal for payment processing (environment-dependent)

### CI/CD Integration

**Supported Platforms**:
- **GitHub**: OAuth integration, repository scanning, GitHub Actions workflow generation
- **GitLab**: Pipeline configuration generation
- **Jenkins**: Jenkinsfile generation with NeuroLint integration
- **Azure DevOps**: Pipeline templates
- **Custom Webhooks**: Generic webhook system for any CI platform

**Features**:
- Automated analysis on push/PR
- Configurable layer execution
- Fail build on quality threshold
- PR comments with analysis results
- Webhook event tracking and history

### Monitoring & Analytics

**Performance Monitoring**:
- Core Web Vitals tracking (LCP, FID, CLS, TTFB, FCP)
- Custom performance metrics via `PerformanceMonitor` component
- Client-side logger for browser environment
- Production logger with structured logging

**Analytics Integration**:
- Vercel Analytics for user behavior
- Vercel Speed Insights for performance
- Custom monitoring service for business metrics
- Error tracking with categorization

**Logging Strategy**:
- Client-safe logger (`lib/client-logger.ts`) for browser
- Production logger (`lib/logger.ts`) with log levels and buffering
- Structured log entries with context (userId, sessionId, requestId)
- Remote logging endpoint support (configurable)

### SEO & Metadata

**Implementation**:
- Dynamic metadata generation per route
- OpenGraph and Twitter Card tags
- Structured data (JSON-LD) for organization, software application, product
- Sitemap generation (`app/sitemap.ts`)
- Robots.txt configuration (`app/robots.ts`)
- Canonical URLs and alternate language tags

**Focus Keywords**: React transformation, Next.js migration, code modernization, automated refactoring

## External Dependencies

### Third-Party Services

**Supabase** (`@supabase/supabase-js@^2.45.0`):
- PostgreSQL database with RLS
- Authentication and user management
- Real-time subscriptions
- Storage (not currently utilized)

**Vercel** (deployment platform):
- Analytics tracking (`@vercel/analytics@^1.3.1`)
- Speed insights (`@vercel/speed-insights@^1.0.12`)
- Edge functions support (configured but not actively used)

**Email Service** (Resend - optional):
- Transactional emails (welcome, password reset, collaboration invites)
- Falls back to mock service if API key not configured
- Configured via `RESEND_API_KEY` environment variable

**Payment Processing**:
- PayPal (optional): Client ID/secret via environment variables
- Stripe support indicated but not fully implemented

### GitHub Integration

**OAuth Flow**:
- GitHub App authentication
- Repository access (read/write)
- Webhook configuration
- API endpoints: `/api/integrations/github/*`

**Features**:
- Repository listing and scanning
- Automated analysis via GitHub Actions
- PR comments with fix suggestions
- Rate limit handling with exponential backoff

### External Monitoring (Optional)

**Sentry**: Error tracking and performance monitoring (configurable via `SENTRY_DSN`)

**Datadog**: Application monitoring (optional, via `DATADOG_API_KEY`)

**Mixpanel**: Product analytics (optional, via `MIXPANEL_TOKEN`)

### Development Dependencies

- **TypeScript** (^5.5.2): Type safety across application
- **Tailwind CSS** (^3.4.4): Utility-first styling
- **PostCSS** & **Autoprefixer**: CSS processing
- **Babel**: Code parsing for AST transformations (in analysis engine)

### Utility Libraries

- **class-variance-authority** (^0.7.0): Component variant management
- **clsx** (^2.1.1): Conditional className utility
- **tailwind-merge** (^2.4.0): Merge Tailwind classes without conflicts

### Database Schema

**Core Tables**:
- `profiles`: User accounts and subscription data
- `projects`: User projects with metadata
- `project_files`: Individual files within projects
- `analysis_history`: Historical analysis results
- `api_keys`: API key management with hashing

**Team Tables**:
- `teams`: Team entities
- `team_members`: Membership with roles
- `team_invitations`: Pending invitations

**Collaboration Tables**:
- `collaboration_sessions`: Live editing sessions
- `collaboration_participants`: Session participants
- `collaboration_comments`: Code comments and discussions

**Billing Tables**:
- `project_subscriptions`: Project-level subscriptions
- `project_usage`: Usage tracking for billing
- `fix_history`: Detailed transformation history
- `billing_cycles`: Monthly billing records

**Integration Tables**:
- `webhooks`: Webhook configurations
- `webhook_events`: Event history
- `integrations`: Third-party service connections (GitHub, GitLab, etc.)
- `integration_runs`: CI/CD run history
- `github_integrations`: GitHub-specific OAuth tokens