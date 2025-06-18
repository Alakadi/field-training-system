# Field Training Management System - Replit Documentation

## Overview

This is a comprehensive Arabic-supported field training management system built for universities to manage student field training. The system provides role-based access for administrators, supervisors, and students with full CRUD operations for managing training programs, student assignments, and evaluations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with custom Tailwind CSS styling
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with memory store (development) / PostgreSQL store (production)
- **Authentication**: Role-based authentication middleware
- **API Design**: RESTful API with consistent error handling

### Database Architecture
- **Primary Database**: PostgreSQL (configured for both local and cloud deployment)
- **ORM**: Drizzle ORM with TypeScript-first schema
- **Connection Handling**: Dual connection strategy - node-postgres for local development, NeonDB for production
- **Schema**: Comprehensive relational schema with proper foreign key relationships

## Key Components

### User Management
- Multi-role authentication system (admin, supervisor, student)
- Role-based access control with middleware protection
- Session-based authentication with secure cookie handling
- User profile management with faculty/department associations

### Academic Structure
- Faculty and major hierarchical organization
- Student level management system
- Supervisor-student assignment tracking
- Training site and course management

### Training Management
- Training course creation and scheduling
- Student assignment to training programs
- Progress tracking and status management
- Evaluation system with supervisor feedback

### Data Management
- Excel import/export functionality for bulk student data
- Activity logging system for audit trails
- Comprehensive reporting capabilities
- Data validation with Zod schemas

## Data Flow

### Authentication Flow
1. User accesses role-specific login page
2. Credentials validated against database
3. Session created with user role information
4. Role-based middleware protects subsequent requests
5. Frontend context manages authentication state

### Training Assignment Flow
1. Admin creates training courses and sites
2. Students browse and apply for available courses
3. Supervisors review and approve assignments
4. Training progress tracked through status updates
5. Evaluations completed by supervisors
6. Results accessible to students and admin

### Data Import Flow
1. Admin uploads Excel file with student data
2. Backend validates file format and content
3. Data processed and imported to database
4. Success/error feedback provided to user
5. Activity logged for audit purposes

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Cloud PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **react-hook-form**: Form handling library
- **zod**: Runtime type validation
- **date-fns**: Date manipulation utilities
- **xlsx**: Excel file processing

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **drizzle-kit**: Database migration tool
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Uses Vite dev server with HMR for frontend
- Node.js server with automatic restart via tsx
- Memory-based session storage for simplicity
- Local PostgreSQL connection via node-postgres

### Production Environment
- Static asset serving via Express
- Compiled TypeScript bundle via esbuild
- PostgreSQL session store for scalability
- NeonDB serverless connection for cloud deployment
- Replit autoscale deployment configuration

### Database Management
- Schema managed through Drizzle migrations
- Push-based deployment for rapid development
- Automated admin user creation on first deploy
- Environment-specific connection handling

## Changelog
- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.