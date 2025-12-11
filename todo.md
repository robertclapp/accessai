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
- [x] Account deletion

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


## Email Verification (New)
- [x] Add emailVerified and verificationToken fields to users table
- [x] Create verification tokens table for secure token storage
- [x] Implement email sending service using built-in notification API
- [x] Create verification email template with accessible design
- [x] Add sendVerificationEmail API endpoint
- [x] Add verifyEmail API endpoint
- [x] Add resendVerificationEmail API endpoint (with rate limiting)
- [x] Update auth flow to check verification status
- [x] Create email verification pending UI component (EmailVerificationBanner)
- [x] Add verification success page (VerifyEmail.tsx)
- [x] Add verification status indicator in Dashboard
- [x] Write tests for email verification flow (52 tests passing)


## Account Deletion (GDPR Compliance) - New
- [x] Account deletion service with cascading data cleanup
- [x] Delete user posts and associated analytics
- [x] Delete knowledge base items
- [x] Delete team memberships and owned teams
- [x] Delete generated images metadata
- [x] Delete social account connections
- [x] Delete notification preferences
- [x] Delete verification tokens
- [x] Cancel active Stripe subscriptions
- [x] Account deletion API endpoint with confirmation
- [x] Deletion confirmation dialog with "DELETE" confirmation
- [x] Data export before deletion option
- [x] 30-day grace period option for account recovery
- [x] Owner notification on account deletion
- [x] Account deletion UI in Settings Privacy tab
- [x] Scheduled deletion banner component
- [x] Cancel deletion functionality
- [x] Write tests for account deletion flow (64 tests passing)


## Public Blog/Content Hub (New)
- [x] Blog posts table with title, slug, content, excerpt, featured image
- [x] Blog categories table
- [x] Blog tags table with many-to-many relationship
- [x] Public blog listing page with pagination
- [x] Category and tag filtering
- [x] Individual blog post page with accessible design
- [x] SEO meta tags (title, description)
- [x] Reading time estimation
- [x] Related posts suggestions
- [x] Social sharing buttons (accessible)
- [x] Admin blog post editor with Markdown support
- [x] Draft/Published/Archived status management
- [x] Featured posts functionality
- [x] Featured image with alt text support
- [x] View count tracking
- [x] Tests for blog functionality (80 tests passing)
- [x] RSS feed for blog
- [x] Sitemap generation
- [x] Seed content with accessibility tips articles


## Blog Seed Content (New)
- [x] Alt text best practices article
- [x] CamelCase hashtags for accessibility article
- [x] Screen reader optimization article
- [x] Color contrast guidelines article
- [x] Keyboard navigation best practices article
- [x] Accessible social media images article
- [x] Writing inclusive content article
- [x] Video accessibility and captions article

## RSS Feed & Sitemap (New)
- [x] RSS feed endpoint (/rss.xml, /feed, /feed.xml)
- [x] Sitemap.xml generation (/sitemap.xml)
- [x] Dynamic sitemap with blog posts and categories
- [x] Robots.txt with sitemap reference
- [x] Proper XML formatting and cache headers

## Code Quality Review (New)
- [x] Review all routers for consistent error handling
- [x] Ensure all functions have JSDoc comments
- [x] Verify input validation on all endpoints
- [x] Check for proper TypeScript types (95/100)
- [x] Review database queries for efficiency
- [x] Ensure consistent logging throughout
- [x] Verify accessibility in all UI components (95/100)
- [x] Check for security best practices (92/100)
- [x] Create CODE_REVIEW.md document
- [x] All 80 tests passing


## Testimonials & Social Proof (New)
- [x] Testimonials database table with name, role, company, quote, avatar, rating
- [x] Featured media/partners table for logo display
- [x] Public API endpoint for fetching testimonials
- [x] Admin API endpoints for CRUD operations
- [x] Testimonials carousel component with accessibility
- [x] Featured on/As seen in logos section
- [x] Star rating display component
- [x] Admin interface for managing testimonials
- [x] Admin interface for managing featured logos
- [x] Integration into landing page (components render when data exists)
- [x] Tests for testimonials functionality (105 tests passing)


## Threads Integration (New)
- [x] Research Threads API requirements and authentication flow
- [x] Create Threads API adapter with OAuth 2.0
- [x] Add Threads to platform enum in database schema
- [x] Implement Threads OAuth callback handler
- [x] Add Threads-specific content formatting (500 char limit, topic tags)
- [x] Update post builder UI to include Threads option
- [x] Update settings page for Threads account connection
- [x] Add Threads to scheduled posting system
- [x] Write tests for Threads integration (122 tests passing)


## Platform Analytics Comparison (New)
- [x] Create analytics aggregation API endpoint
- [x] Add platform-level metrics (posts, engagement, impressions)
- [x] Build PlatformComparison dashboard component
- [x] Create bar chart for cross-platform engagement comparison
- [x] Create line chart for performance trends over time
- [x] Add best performing platform indicator with recommendations
- [x] Create engagement rate calculations per platform
- [x] Add date range filter for analytics
- [x] Build platform performance cards with key metrics
- [ ] Add export analytics comparison report
- [x] Write tests for analytics comparison feature (137 tests passing)


## Analytics Export (New)
- [x] Create export API endpoint for analytics data
- [x] Generate CSV export with platform metrics
- [x] Generate JSON export option
- [x] Add export buttons to PlatformAnalytics page
- [x] Include date range in export

## Platform Goal Setting (New)
- [x] Create platform_goals database table
- [x] Create goal_history table for tracking progress
- [x] Add CRUD API endpoints for goals
- [x] Build goal setting modal UI with platform selection
- [x] Display progress bars toward goals
- [x] Show achieved/not achieved status
- [x] Add goal deletion functionality
- [x] Add period type selection (weekly/monthly/quarterly)

## Competitor Benchmarking (New)
- [x] Create industry_benchmarks database table
- [x] Add default benchmark data for 6 industries
- [x] Create benchmarking comparison API
- [x] Build benchmarking visualization component
- [x] Show user vs industry average/median/top performer
- [x] Add industry selector dropdown
- [x] Display percentile ranking
- [x] Add comparison badges (below/average/above/top performer)
- [x] Provide actionable recommendations per platform
- [x] Write tests for all new features (154 tests passing)


## Bluesky Integration (New)
- [x] Research Bluesky AT Protocol API
- [x] Create Bluesky API adapter with app password auth
- [x] Add Bluesky to platform enum in database schema
- [x] Implement Bluesky authentication (app password)
- [x] Add Bluesky-specific content formatting (300 char limit)
- [x] Update post builder UI to include Bluesky option
- [x] Update settings page for Bluesky account connection
- [x] Add Bluesky to scheduled posting system
- [x] Write tests for Bluesky integration (174 tests passing)

## Email Digest Reports (New)
- [x] Create email digest preferences table
- [x] Add digest frequency settings (weekly/monthly)
- [x] Build analytics summary email template
- [x] Include goal progress in digest
- [x] Include top performing posts
- [x] Include platform comparison highlights
- [x] Add digest API endpoints (get/update preferences, preview, send test)
- [x] Add digest settings to user preferences
- [x] Write tests for email digest functionality (174 tests passing)

## A/B Testing for Posts (New)
- [x] Create ab_tests database table
- [x] Create ab_test_variants table
- [x] Add API endpoints for creating A/B tests
- [x] Build A/B test creation UI at /ab-testing
- [x] Display variant performance comparison
- [x] Calculate statistical significance
- [x] Declare winning variant with confidence level
- [x] Add A/B test history view
- [x] Add A/B Testing to sidebar navigation
- [x] Write tests for A/B testing functionality (174 tests passing)


## Email Digest Settings UI (New)
- [x] Add "Email Digests" tab to Settings page
- [x] Create digest enable/disable toggle
- [x] Add frequency selector (weekly/monthly)
- [x] Add day of week/month selector
- [x] Add delivery time (hour) selector
- [x] Add content section toggles (analytics, goals, top posts, platform comparison, scheduled posts)
- [x] Add preview digest button
- [x] Add send test digest button
- [x] Show last digest sent date
- [x] Save preferences on change (197 tests passing)

## A/B Test Winner Scheduling (New)
- [x] Add "Schedule Winner" button to completed A/B tests
- [x] Create scheduling dialog for winner variant
- [x] Allow date/time selection for repost
- [x] Allow platform selection for repost
- [x] Create scheduled post from winning variant content
- [x] Show scheduled repost status on test details
- [x] Add API endpoint for scheduling winner (197 tests passing)

## Mastodon Integration (New)
- [x] Research Mastodon API and OAuth flow
- [x] Create Mastodon API adapter with OAuth
- [x] Add Mastodon to platform enum in database schema
- [x] Implement Mastodon OAuth callback handler
- [x] Add Mastodon-specific content formatting (500 char limit)
- [x] Update post builder UI to include Mastodon option
- [x] Update settings page for Mastodon account connection
- [x] Add Mastodon to all platform constants
- [x] Write tests for Mastodon integration (197 tests passing)


## Mastodon Content Warning Support (New)
- [x] Add contentWarning field to posts table
- [x] Update Mastodon adapter to include spoiler_text parameter
- [x] Add CW input field to PostBuilder when Mastodon is selected
- [x] Add CW toggle/input to post creation form
- [x] Display CW indicator on post previews
- [x] Write tests for CW functionality (211 tests passing)

## Scheduled Digest Preview (New)
- [x] Calculate next digest send time based on preferences
- [x] Display next send date/time in Email Digests settings
- [x] Show countdown to next digest
- [x] Handle timezone display for user (local timezone)
- [x] Update preview when preferences change
- [x] Write tests for preview calculation (211 tests passing)

## Bulk A/B Test Creation (New)
- [x] Allow selecting multiple platforms for A/B test
- [x] Create separate test instances per platform
- [x] Add bulk test toggle in create dialog
- [x] Add multi-platform selector UI with checkboxes
- [x] Show platform count in create button
- [x] Preserve variant content across platforms
- [x] Write tests for bulk A/B test functionality (211 tests passing)


## Cross-Platform A/B Test Comparison (New)
- [x] Add bulk test group identifier to ab_tests table
- [x] Create API endpoint for fetching related bulk tests
- [x] Build comparison view showing results side-by-side
- [x] Display engagement metrics per platform
- [x] Highlight best performing platform
- [x] Add visual comparison charts
- [x] Write tests for comparison functionality (228 tests passing)

## Content Warning Presets (New)
- [x] Create cw_presets database table
- [x] Add CRUD API endpoints for CW presets
- [x] Build preset selector dropdown in PostBuilder
- [x] Add "Save as preset" option for custom CW text
- [x] Include default presets (Politics, Spoiler, Food, etc.)
- [x] Allow editing and deleting presets
- [x] Write tests for CW presets (228 tests passing)

## Digest Email Preview in Browser (New)
- [x] Create formatDigestHtml function for styled HTML email
- [x] Update previewDigest endpoint to return HTML version
- [x] Add "Preview in Browser" button to Email Digests settings
- [x] Open preview in new browser window (700x800)
- [x] Include all sections (analytics, goals, posts, platforms)
- [x] Write tests for digest preview (228 tests passing)


## Mastodon Post Templates (New)
- [x] Create mastodon_templates database table
- [x] Add template categories (general, politics, spoiler, food, etc.)
- [x] Include content warning preset per template
- [x] Add hashtag suggestions per template
- [x] Create CRUD API endpoints for templates
- [x] Build template selector in PostBuilder for Mastodon
- [x] Add default templates for common content types
- [x] Write tests for Mastodon templates (250 tests passing)

## Digest Scheduling Job (New)
- [x] Create background worker service for digest scheduling
- [x] Check for due digests based on user preferences
- [x] Handle weekly digest scheduling (day of week + hour)
- [x] Handle monthly digest scheduling (day of month + hour)
- [x] Track last sent timestamp to prevent duplicates
- [x] Add retry logic for failed sends
- [x] Create scheduler status endpoint
- [x] Write tests for digest scheduling (250 tests passing)

## AI A/B Test Insights (New)
- [x] Create insights generation service using LLM
- [x] Analyze variant performance differences (emojis, hashtags, CTAs, questions)
- [x] Generate content recommendations
- [x] Identify winning patterns (length, tone, hashtags)
- [x] Suggest improvements for future posts
- [x] Add insights display to A/B test results
- [x] Cache insights to avoid repeated API calls
- [x] Write tests for insights generation (250 tests passing)


## Mastodon Template Management UI (New)
- [x] Create MastodonTemplates page component
- [x] Build template list view with categories
- [x] Add template creation dialog
- [x] Add template editing dialog
- [x] Build live preview component showing formatted post
- [x] Display CW preview with spoiler tag
- [x] Show hashtag preview with CamelCase formatting
- [x] Add template deletion with confirmation
- [x] Add template search and filtering
- [x] Add route to App.tsx and navigation
- [x] Write tests for template management (285 tests passing)

## Digest Delivery Tracking (New)
- [x] Add tracking fields to digest preferences (opens, clicks)
- [x] Create digest_tracking table for individual send records
- [x] Add tracking pixel endpoint for open tracking
- [x] Add click tracking endpoint with redirect
- [x] Update digest HTML to include tracking pixel
- [x] Wrap links with click tracking URLs
- [x] Build delivery analytics display in Settings
- [x] Show open rate and click rate metrics
- [x] Write tests for delivery tracking (318 tests passing)

## A/B Test History Insights (New)
- [x] Create aggregated insights service
- [x] Analyze patterns across all completed tests
- [x] Identify consistently winning content patterns
- [x] Generate long-term strategy recommendations
- [x] Build history insights dashboard component
- [x] Show pattern frequency charts
- [x] Display top performing content characteristics
- [x] Add insights summary to A/B Testing page
- [x] Write tests for history insights (339 tests passing)

## Template Duplication (New)
- [x] Add duplicate endpoint to mastodonTemplates router
- [x] Add duplicate button to template list UI
- [x] Show confirmation with editable name for duplicated template
- [x] Write tests for template duplication (366 tests passing)

## Digest Scheduling Preview (New)
- [x] Create digest preview endpoint
- [x] Build preview component showing next scheduled digest
- [x] Display preview in Settings Email Digests tab
- [x] Show scheduled time and content preview
- [x] Write tests for digest preview (366 tests passing)

## Export Insights as PDF (New)
- [x] Create PDF generation endpoint for insights
- [x] Build PDF layout with charts and recommendations
- [x] Add export button to History Insights dialog
- [x] Handle PDF download in browser
- [x] Write tests for PDF export (366 tests passing)

## Custom Template Categories Management (New)
- [x] Create template_categories table in schema
- [x] Add database functions for category CRUD
- [x] Create category management endpoints in router
- [x] Build category management UI component
- [x] Add category selector to template creation/edit dialogs
- [x] Update template list to filter by custom categories
- [x] Write tests for category management (395 tests passing)

## Digest Pause/Resume (New)
- [x] Add pausedAt and pauseReason fields to digest preferences
- [x] Create pause/resume endpoints
- [x] Build pause/resume UI in Settings
- [x] Show pause status indicator
- [x] Prevent digest sending when paused
- [x] Write tests for pause/resume functionality (395 tests passing)

### Insights Comparison Over Time (New)
- [x] Create time period comparison endpoint
- [x] Build comparison UI with date range selectors
- [x] Show side-by-side metrics comparison
- [x] Display trend indicators (improving/declining)
- [x] Generate period-specific insights
- [x] Write tests for time comparison (395 tests passing)

## Category Drag-and-Drop Reordering (New)
- [x] Add sortOrder field to template_categories table (already exists)
- [x] Create reorder endpoint in router
- [x] Install dnd-kit library for drag-and-drop
- [x] Build drag-and-drop UI for categories
- [x] Persist order changes to database
- [x] Write tests for category reordering (422 tests passing)

## Digest Pause Reminder Notification (New)
- [x] Create reminder check function
- [x] Send reminder email 24 hours before auto-resume
- [x] Track reminder sent status to avoid duplicates
- [x] Add reminder email template
- [x] Write tests for pause reminder (422 tests passing)

## Time Comparison PDF Export (New)
- [x] Create PDF generation service for time comparison
- [x] Build PDF layout with comparison metrics
- [x] Add export button to comparison dialog
- [x] Handle PDF download in browser
- [x] Write tests for comparison PDF export (422 tests passing)

## Custom Color Picker for Categories (New)
- [x] Replace preset color options with full color picker (already implemented with type="color" input)
- [x] Add color picker component to category management dialog (already implemented)
- [x] Validate and store hex color values (already implemented)
- [x] Display custom colors in category list and template cards (enhance display)
- [x] Write tests for color picker functionality (455 tests passing)

## Digest Content Customization (New)
- [x] Add section order and visibility fields to digest preferences
- [x] Create section reordering UI with drag-and-drop
- [x] Add toggle switches to show/hide sections
- [x] Update digest email generation to respect customization
- [x] Write tests for digest customization (455 tests passing)

## A/B Test Templates (New)
- [x] Create ab_test_templates table in schema
- [x] Add database functions for template CRUD
- [x] Create template management endpoints in router
- [x] Build templates UI with system and custom templates
- [x] Add template usage tracking
- [x] Seed system templates (question vs statement, short vs long, etc.)
- [x] Write tests for A/B test templates (455 tests passing)

## Template Preview with Sample Content (New)
- [x] Add sample content input field to template preview
- [x] Create live preview component showing both variants
- [x] Apply template placeholders to sample content
- [x] Show side-by-side comparison of variants
- [x] Write tests for template preview (481 tests passing)

## Digest A/B Testing (New)
- [x] Create digest_ab_tests table in schema
- [x] Add database functions for digest A/B test CRUD
- [x] Create digest A/B test endpoints in router
- [x] Build digest A/B test UI in Settings
- [x] Track open rates for each digest variant
- [x] Determine winning format based on engagement
- [x] Write tests for digest A/B testing (481 tests passing)

## Template Sharing (New)
- [x] Add isPublic and shareCount fields to templates
- [x] Create shared templates endpoints (list, share, unshare)
- [x] Build community templates browser UI
- [x] Add copy-to-my-templates functionality
- [x] Show attribution for shared templates
- [x] Write tests for template sharing (481 tests passing)

## Template Ratings (New)
- [x] Create template_ratings table in schema
- [x] Add rating endpoints (rate, get ratings, get average)
- [x] Build star rating component for community templates
- [x] Display average rating on template cards
- [x] Sort community templates by rating (Top Rated tab)
- [x] Write tests for template ratings (507 tests passing)

## Digest A/B Test Scheduling (New)
- [x] Add scheduling fields to digest_ab_tests table
- [x] Create scheduling endpoints (schedule, cancel)
- [x] Build scheduling UI in digest A/B test dialog
- [x] Auto-start tests at scheduled time
- [x] Write tests for digest test scheduling (507 tests passing)

## Template Version History (New)
- [x] Create template_versions table in schema
- [x] Track changes on template update
- [x] Add version history endpoint
- [x] Build version history UI component
- [x] Add revert to previous version functionality
- [x] Write tests for version history (507 tests passing)

## Rating Comments (New)
- [x] Add comment field to template_ratings table (already exists as 'review')
- [x] Update rating endpoints to include comments (already supports review field)
- [x] Build comment display UI under template cards
- [x] Add comment input in rating dialog (already exists with Textarea)
- [x] Show review count on template cards
- [x] Enhanced rating dialog with community reviews section
- [x] Character limit (500) for reviews
- [x] Write tests for rating comments (530 tests passing)

## Digest Test Auto-Complete (New)
- [x] Create statistical significance calculation for digest tests
- [x] Add auto-complete check on digest send
- [x] Update digest test status when significance reached
- [x] Declare winner automatically based on open rates
- [x] Add confidence level display in UI
- [x] Add auto-complete settings dialog (enable/disable, min sample size, confidence threshold)
- [x] Add auto-complete status indicator in running test alert
- [x] Add "Auto-complete now" button when significance reached
- [x] Add schema fields for auto-complete settings
- [x] Write tests for auto-complete functionality (530 tests passing)

## Template Import/Export (New)
- [x] Create template export endpoint (JSON format)
- [x] Create template import endpoint with validation
- [x] Create bulk export endpoint for multiple templates
- [x] Create bulk import endpoint for multiple templates
- [x] Build export button in templates UI (individual and bulk)
- [x] Build import dialog with file upload and JSON paste
- [x] Add checkbox selection for bulk export
- [x] Validate imported template structure
- [x] Handle duplicate template names (append import date)
- [x] Write tests for import/export (530 tests passing)

## Email Notifications for Digest Auto-Complete (New)
- [x] Create notification function for auto-complete events
- [x] Send email when test reaches statistical significance
- [x] Include winning variant details in notification
- [x] Include confidence level and open rate comparison
- [x] Notification sent automatically when test auto-completes
- [x] Write tests for notification functionality (566 tests passing)

## Template Marketplace (New)
- [x] Create marketplace page component (/marketplace route)
- [x] Add filtering by category, rating, popularity
- [x] Add search functionality for templates
- [x] Show template previews with ratings and usage stats
- [x] Add "Download" button to copy template to user's library
- [x] Add sorting options (most popular, highest rated, newest, downloads)
- [x] Add trending templates sidebar (last 7 days activity)
- [x] Add template preview dialog with full details
- [x] Public access (no login required to browse)
- [x] Write tests for marketplace functionality (566 tests passing)

## Template Analytics (New)
- [x] Add template_analytics table for tracking exports/downloads
- [x] Track template export events
- [x] Track template import/download events
- [x] Track view and use events
- [x] Calculate popularity scores based on usage
- [x] Add performance metrics (usage count, downloads, rating)
- [x] Build analytics dashboard tab in templates dialog
- [x] Show summary cards (total templates, public, downloads, exports)
- [x] Show top performing templates with rankings
- [x] Add trending templates calculation (activity score)
- [x] Write tests for template analytics (566 tests passing)
