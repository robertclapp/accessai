# AccessAI Project TODO

## Database & Schema
- [x] User table with accessibility preferences and subscription tier
- [x] Posts table with platform, status, accessibility score
- [x] Templates table for content frameworks
- [x] Knowledge base table for brand guidelines and swipe files
- [x] Teams and team members tables
- [x] Content calendar/scheduled posts
- [x] Analytics tracking

## Core AI Features
- [x] AI content generation with personalized style learning
- [x] AI accessibility checker with WCAG compliance scoring
- [x] AI alt text generation for images
- [x] AI content rewriting and tone adjustment

## Voice-to-Text (Whisper API)
- [x] Audio recording in browser
- [x] Whisper API integration for transcription
- [x] Voice command processing
- [x] Hands-free content creation workflow

## Multi-Platform Support
- [x] LinkedIn post formatting
- [x] X (Twitter) post formatting
- [x] Facebook post formatting
- [x] Instagram post formatting
- [x] Platform-specific character limits and best practices

## Smart Post Builder
- [x] Accessible content templates
- [x] Content frameworks (AIDA, PAS, etc.)
- [x] Template library management
- [x] Custom template creation

## Knowledge Base
- [x] Brand guidelines storage
- [x] Swipe file management
- [x] Custom AI instructions
- [x] Content categorization

## Content Calendar
- [x] Visual calendar interface
- [x] Drag-and-drop scheduling
- [ ] Bulk scheduling
- [ ] Calendar export

## Analytics Dashboard
- [x] Post performance tracking
- [x] Engagement metrics
- [x] Accessibility score trends
- [x] Content insights

## Team Collaboration
- [x] Team creation and management
- [x] User roles and permissions
- [x] Approval workflows
- [ ] Team activity feed

## Accessibility Features
- [x] Screen reader optimization
- [x] Full keyboard navigation
- [x] ARIA labels throughout
- [x] High contrast mode
- [x] Dyslexia-friendly font option
- [x] Adjustable font sizes

## Image Generation
- [x] AI image generation from prompts
- [x] Social media graphic templates
- [ ] Image editing and customization

## Stripe Payments
- [x] Subscription tiers (Free, Creator, Pro)
- [x] Payment processing
- [x] Subscription management
- [x] Usage tracking

## Owner Notifications
- [x] New user signup alerts
- [x] Paid tier upgrade alerts
- [x] Accessibility issue reports

## UI/UX
- [x] Landing page
- [x] Dashboard layout
- [x] Post editor interface
- [x] Settings pages
- [x] Responsive design

## CI/CD & Testing
- [x] GitHub Actions workflow
- [x] TypeScript type checking
- [x] Vitest unit tests
- [x] Accessibility audit (Lighthouse)
- [x] Security scanning


## Settings Page (New)
- [x] Profile management (name, email)
- [x] Accessibility preferences (font size, high contrast, reduced motion, dyslexia font)
- [x] Notification settings (email, in-app, frequency)
- [x] Connected social accounts management
- [x] Subscription and billing information
- [x] Writing style preferences
- [x] Data export functionality
- [ ] Account deletion

## Social Media API Integrations (New)
- [x] LinkedIn API adapter with OAuth 2.0
- [x] X (Twitter) API adapter with OAuth 2.0
- [x] Facebook API adapter with OAuth 2.0
- [x] Instagram API adapter (via Facebook Graph API)
- [x] OAuth callback handler for all platforms
- [x] Unified social adapter interface
- [x] Token refresh handling
- [x] Multi-platform posting support
- [x] Platform-specific content formatting
- [x] Accessible hashtag formatting (CamelCase)
- [x] Post scheduling with API publishing


## Data Export (New)
- [x] Export posts as CSV
- [x] Export posts as JSON
- [x] Export analytics data
- [x] Export knowledge base items
- [x] Export team data
- [x] Download generated images
- [x] Upload to S3 for download
- [x] UI for selecting export type and format

## Scheduled Posting System (New)
- [x] Background worker for scheduled posts
- [x] Batch processing of due posts
- [x] Token refresh handling
- [x] Retry logic for failed posts
- [x] Scheduler status monitoring
- [x] Admin controls (start/stop/trigger)
- [x] Statistics tracking
- [x] Owner notifications for failures

## Code Refactoring (New)
- [x] Add comprehensive JSDoc comments
- [x] Improve error handling with custom error classes
- [x] Add input validation helpers
- [x] Add logging infrastructure
- [x] Improve type safety
- [x] Extract reusable utilities
- [x] Add constants file for magic numbers
- [x] Comprehensive test coverage (34 tests passing)


## User Onboarding Flow (New)
- [x] OnboardingTour component with step-by-step guidance
- [x] Tour highlight/spotlight effect for target elements
- [x] Welcome modal for first-time users
- [x] Voice input tour step with demo
- [x] Accessibility checker tour step with example
- [x] Content calendar tour step with walkthrough
- [x] Post builder tour step
- [x] Knowledge base tour step
- [x] Onboarding completion tracking in database
- [x] Skip tour option
- [x] Restart tour from settings
- [x] Progress indicator during tour
- [x] Keyboard navigation for tour
- [x] Screen reader announcements for tour steps
