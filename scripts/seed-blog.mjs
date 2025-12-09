/**
 * Blog Seed Script
 * 
 * Seeds the database with accessibility tip articles for launch.
 * Run with: node scripts/seed-blog.mjs
 */

import { drizzle } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';

// Blog categories to seed
const categories = [
  {
    name: 'Accessibility Basics',
    slug: 'accessibility-basics',
    description: 'Foundational concepts and best practices for digital accessibility',
  },
  {
    name: 'Social Media',
    slug: 'social-media',
    description: 'Tips for creating accessible content on social platforms',
  },
  {
    name: 'Visual Design',
    slug: 'visual-design',
    description: 'Color, contrast, and visual accessibility guidelines',
  },
  {
    name: 'Assistive Technology',
    slug: 'assistive-technology',
    description: 'Working with screen readers and other assistive tools',
  },
];

// Blog tags to seed
const tags = [
  { name: 'WCAG', slug: 'wcag' },
  { name: 'Alt Text', slug: 'alt-text' },
  { name: 'Screen Readers', slug: 'screen-readers' },
  { name: 'Color Contrast', slug: 'color-contrast' },
  { name: 'Keyboard Navigation', slug: 'keyboard-navigation' },
  { name: 'Captions', slug: 'captions' },
  { name: 'Inclusive Design', slug: 'inclusive-design' },
  { name: 'LinkedIn', slug: 'linkedin' },
  { name: 'Twitter', slug: 'twitter' },
  { name: 'Instagram', slug: 'instagram' },
];

// Blog articles to seed
const articles = [
  {
    title: 'The Complete Guide to Writing Effective Alt Text',
    slug: 'complete-guide-alt-text',
    excerpt: 'Learn how to write descriptive, meaningful alt text that makes your images accessible to everyone, including screen reader users.',
    content: `# The Complete Guide to Writing Effective Alt Text

Alt text (alternative text) is one of the most important accessibility features you can add to your content. It provides a text description of images for people who cannot see them, including those using screen readers, those with slow internet connections, and search engines.

## Why Alt Text Matters

Over 2.2 billion people worldwide have some form of vision impairment. When you include proper alt text, you're ensuring that:

- Screen reader users can understand your visual content
- Your content is accessible during slow loading times
- Search engines can properly index your images
- Your content complies with accessibility laws like the ADA

## The Golden Rules of Alt Text

### 1. Be Descriptive, Not Decorative

Instead of writing "image of person," describe what's actually happening:

**Bad:** "Photo of woman"
**Good:** "A woman using a laptop while sitting in a wheelchair at a modern office desk"

### 2. Context is Everything

The same image might need different alt text depending on where it's used. A photo of a coffee cup on a café website might be described as "Our signature latte with leaf art," while on a pottery website it might be "Handcrafted ceramic mug in ocean blue glaze."

### 3. Keep It Concise

Aim for 125 characters or less when possible. Screen readers announce "image" before reading alt text, so users already know it's an image.

### 4. Skip "Image of" or "Picture of"

Screen readers already announce that it's an image, so these phrases are redundant.

### 5. Include Text in Images

If your image contains text (like an infographic), include that text in your alt description or provide it in the surrounding content.

## Alt Text for Different Image Types

### Informative Images
Describe the content and function: "Bar chart showing 40% increase in accessible website usage from 2020 to 2024"

### Decorative Images
Use empty alt text (alt="") for purely decorative images that don't add meaning.

### Functional Images (Buttons/Links)
Describe the action: "Submit form" or "Download PDF report"

### Complex Images (Charts/Graphs)
Provide a brief alt text and a longer description nearby: "Sales data chart. Full data available in the table below."

## Common Mistakes to Avoid

1. **Leaving alt text blank** on meaningful images
2. **Keyword stuffing** for SEO purposes
3. **Being too vague** ("photo" or "image")
4. **Being too long** (over 250 characters)
5. **Describing irrelevant details** instead of the image's purpose

## Practice Exercise

Look at your last 5 social media posts. How would you describe each image to someone who couldn't see it? Write out your alt text and review it against these guidelines.

## Conclusion

Writing good alt text is a skill that improves with practice. Start by asking yourself: "What information would someone miss if they couldn't see this image?" Your answer is your alt text.

Remember: accessibility isn't just about compliance—it's about ensuring everyone can engage with your content. Every image with good alt text is a step toward a more inclusive internet.`,
    metaTitle: 'Complete Guide to Writing Effective Alt Text | AccessAI',
    metaDescription: 'Learn how to write descriptive, meaningful alt text that makes your images accessible to screen reader users and improves SEO.',
    categorySlug: 'accessibility-basics',
    tagSlugs: ['alt-text', 'wcag', 'screen-readers'],
    featured: true,
    readingTimeMinutes: 6,
  },
  {
    title: 'Why CamelCase Hashtags Make Social Media Accessible',
    slug: 'camelcase-hashtags-accessibility',
    excerpt: 'Discover how a simple capitalization change in your hashtags can make your content accessible to millions of screen reader users.',
    content: `# Why CamelCase Hashtags Make Social Media Accessible

Have you ever wondered how a screen reader pronounces #accessibilitymatters? Without proper formatting, it becomes one long, confusing word. But #AccessibilityMatters? That's read as three distinct words.

## What is CamelCase?

CamelCase (also called PascalCase when the first letter is capitalized) is a naming convention where each word in a compound phrase starts with a capital letter:

- #socialmedia → #SocialMedia
- #disabilityawareness → #DisabilityAwareness  
- #webaccessibility → #WebAccessibility

## How Screen Readers Handle Hashtags

Screen readers like JAWS, NVDA, and VoiceOver use capitalization as a cue to separate words. When they encounter #BlackLivesMatter, they read it as "hashtag Black Lives Matter." But #blacklivesmatter becomes "hashtag blacklivesmatter"—one unintelligible string.

### Real Examples

| Hashtag | Screen Reader Output |
|---------|---------------------|
| #nowplaying | "hashtag nowplaying" |
| #NowPlaying | "hashtag Now Playing" |
| #a11y | "hashtag a eleven y" |
| #A11y | "hashtag A eleven y" |

## The Impact is Massive

- **285 million** people worldwide have visual impairments
- **39 million** are completely blind
- Screen reader usage has grown **30%** in the last 5 years
- **71%** of users with disabilities leave websites that aren't accessible

When you use CamelCase hashtags, you're including all of these potential followers and customers.

## Best Practices for Accessible Hashtags

### 1. Capitalize Every Word
#ThisIsHowYouDoIt not #thisishowyoudit

### 2. Keep Hashtags Readable
Avoid overly long hashtags even with CamelCase. #ThisHashtagIsWayTooLongAndHardToRead is still problematic.

### 3. Place Hashtags Strategically
Put hashtags at the end of your post, not scattered throughout. This makes content easier to read for everyone.

### 4. Limit Your Hashtags
Quality over quantity. 3-5 well-chosen, accessible hashtags beat 30 inaccessible ones.

### 5. Avoid Numbers in the Middle
#Best4You reads as "Best four You" which might not be your intent. Consider #BestForYou instead.

## Platform-Specific Tips

### LinkedIn
LinkedIn's algorithm favors 3-5 hashtags. Make them count with CamelCase.

### Twitter/X
With character limits, every letter matters. CamelCase doesn't add characters but adds accessibility.

### Instagram
Even with 30 allowed hashtags, use CamelCase for all of them. Your disabled followers will thank you.

## The Business Case

Accessible content isn't just ethical—it's smart business:

- **$13 trillion** in annual disposable income among people with disabilities globally
- **73%** of customers with disabilities have left a business due to poor accessibility
- Accessible brands see **higher engagement** and **better SEO**

## Quick Reference Guide

| Instead of | Use |
|------------|-----|
| #contentcreator | #ContentCreator |
| #smallbusiness | #SmallBusiness |
| #mentalhealthawareness | #MentalHealthAwareness |
| #workfromhome | #WorkFromHome |
| #digitalmarketing | #DigitalMarketing |

## Take Action Today

1. Review your last 10 posts
2. Update any hashtags to CamelCase
3. Create a list of your most-used hashtags in CamelCase format
4. Share this knowledge with your team

## Conclusion

CamelCase hashtags are the simplest accessibility fix you can make. Zero extra effort, zero extra cost, but massive impact for millions of users. Start today, and make every hashtag count.

#AccessibilityMatters #InclusiveDesign #A11y`,
    metaTitle: 'Why CamelCase Hashtags Make Social Media Accessible | AccessAI',
    metaDescription: 'Learn how capitalizing each word in hashtags helps screen readers and makes your social media content accessible to millions.',
    categorySlug: 'social-media',
    tagSlugs: ['screen-readers', 'inclusive-design', 'twitter', 'linkedin', 'instagram'],
    featured: true,
    readingTimeMinutes: 5,
  },
  {
    title: 'Screen Reader Optimization: A Content Creator\'s Guide',
    slug: 'screen-reader-optimization-guide',
    excerpt: 'Master the art of creating content that works beautifully with screen readers, from structure to formatting.',
    content: `# Screen Reader Optimization: A Content Creator's Guide

Screen readers are software applications that convert digital text into synthesized speech or braille output. Understanding how they work is essential for creating truly accessible content.

## How Screen Readers Navigate Content

Screen readers don't "see" your content—they interpret the underlying structure. They navigate using:

- **Headings** (H1, H2, H3, etc.)
- **Links** and buttons
- **Lists** (ordered and unordered)
- **Landmarks** (navigation, main content, footer)
- **Tables** (with proper headers)

## The Heading Hierarchy

Headings are the backbone of screen reader navigation. Users can jump between headings to quickly find content.

### Rules for Headings

1. **One H1 per page** - This is your main title
2. **Don't skip levels** - Go from H2 to H3, not H2 to H4
3. **Use headings for structure, not styling** - Don't use H3 just because you want smaller text
4. **Make headings descriptive** - "Our Services" is better than "More Info"

### Bad Example
\`\`\`
H1: Welcome
H3: About Us (skipped H2!)
H2: Services (out of order!)
\`\`\`

### Good Example
\`\`\`
H1: Welcome to AccessAI
  H2: About Us
    H3: Our Mission
    H3: Our Team
  H2: Services
    H3: Content Creation
    H3: Accessibility Audits
\`\`\`

## Writing for Screen Readers

### Link Text

Screen reader users often navigate by links. "Click here" tells them nothing.

**Bad:** "To learn more about accessibility, click here."
**Good:** "Learn more about accessibility best practices."

### Lists

Use proper list formatting instead of manual bullets or dashes. Screen readers announce "list of 5 items" which helps users understand the content structure.

### Abbreviations and Acronyms

Spell out abbreviations on first use, or use the <abbr> tag:

"The Web Content Accessibility Guidelines (WCAG) provide standards for accessible content."

## Common Screen Reader Behaviors

### Reading Order

Screen readers follow the DOM order, not visual order. Ensure your content makes sense when read linearly.

### Punctuation

Screen readers pause at periods and commas. Use punctuation to create natural reading rhythm.

"Welcome to our site we have great products" reads as one rushed sentence.
"Welcome to our site. We have great products." has natural pauses.

### Emoji

Screen readers read emoji descriptions aloud. "I love pizza 🍕🍕🍕" becomes "I love pizza pizza slice pizza slice pizza slice."

Use emoji sparingly and meaningfully.

## Testing with Screen Readers

### Free Options

- **NVDA** (Windows) - Free, open-source
- **VoiceOver** (Mac/iOS) - Built into Apple devices
- **TalkBack** (Android) - Built into Android devices
- **Narrator** (Windows) - Built into Windows

### Quick Testing Checklist

1. Can you navigate by headings?
2. Do links make sense out of context?
3. Are images described with alt text?
4. Do forms have proper labels?
5. Is the reading order logical?

## Social Media Considerations

### Platform-Specific Features

- **Twitter/X:** Alt text field for images
- **LinkedIn:** Alt text in image upload
- **Instagram:** Alt text in advanced settings
- **Facebook:** Automatic alt text (but add your own!)

### Content Structure

Even without HTML headings, you can create structure:

\`\`\`
📢 ANNOUNCEMENT

Here's the main point of my post.

KEY TAKEAWAYS:
• First point
• Second point
• Third point

🔗 Link in bio for more
\`\`\`

## Advanced Tips

### ARIA Labels

For web content, ARIA labels provide additional context:

\`\`\`html
<button aria-label="Close dialog">X</button>
\`\`\`

### Skip Links

Allow users to skip repetitive navigation:

\`\`\`html
<a href="#main-content" class="skip-link">Skip to main content</a>
\`\`\`

### Focus Management

Ensure keyboard focus is visible and logical. Users should always know where they are on the page.

## Conclusion

Screen reader optimization isn't about adding complexity—it's about creating clear, well-structured content. When you optimize for screen readers, you improve the experience for everyone.

Start with headings, write descriptive links, and test with actual screen readers. Your content will be better for it.`,
    metaTitle: 'Screen Reader Optimization Guide for Content Creators | AccessAI',
    metaDescription: 'Learn how to create content that works beautifully with screen readers, from proper heading structure to descriptive links.',
    categorySlug: 'assistive-technology',
    tagSlugs: ['screen-readers', 'wcag', 'inclusive-design'],
    featured: false,
    readingTimeMinutes: 7,
  },
  {
    title: 'Color Contrast: The Foundation of Visual Accessibility',
    slug: 'color-contrast-visual-accessibility',
    excerpt: 'Understanding WCAG color contrast requirements and how to create designs that everyone can see clearly.',
    content: `# Color Contrast: The Foundation of Visual Accessibility

Color contrast is one of the most fundamental aspects of visual accessibility. Poor contrast makes content difficult or impossible to read for millions of people with low vision, color blindness, or those viewing screens in bright sunlight.

## Understanding Contrast Ratios

Contrast ratio is the difference in luminance between foreground and background colors, expressed as a ratio like 4.5:1 or 7:1.

### WCAG Requirements

| Level | Normal Text | Large Text | UI Components |
|-------|-------------|------------|---------------|
| AA (Minimum) | 4.5:1 | 3:1 | 3:1 |
| AAA (Enhanced) | 7:1 | 4.5:1 | 4.5:1 |

**Large text** is defined as 18pt (24px) or 14pt (18.5px) bold.

## Who Benefits from Good Contrast?

- **Low vision users** (246 million people globally)
- **Color blind users** (300 million people, 8% of men)
- **Aging populations** (vision naturally declines with age)
- **Everyone** in bright sunlight or on low-quality screens
- **Users with cognitive disabilities** who benefit from clear visual hierarchy

## Common Contrast Mistakes

### 1. Light Gray on White

The classic "designer gray" of #999999 on white (#FFFFFF) has a contrast ratio of only 2.85:1—failing even the minimum AA standard.

**Fix:** Use #767676 or darker for body text on white backgrounds.

### 2. Trendy Color Combinations

Many popular color schemes fail accessibility:

| Combination | Ratio | Passes AA? |
|-------------|-------|------------|
| Light blue on white | 2.5:1 | ❌ No |
| Yellow on white | 1.07:1 | ❌ No |
| Light green on white | 2.3:1 | ❌ No |
| Orange on white | 2.9:1 | ❌ No |

### 3. Placeholder Text

Form placeholder text is often too light. If it conveys important information, it needs proper contrast.

### 4. Disabled States

Even disabled buttons should have sufficient contrast to be readable, even if not actionable.

## Tools for Checking Contrast

### Free Online Tools

- **WebAIM Contrast Checker** - Simple and reliable
- **Colour Contrast Analyser** - Desktop application
- **Stark** - Figma/Sketch plugin
- **axe DevTools** - Browser extension

### Quick Checks

In Chrome DevTools, inspect an element and look at the color picker—it shows contrast ratio and WCAG compliance.

## Designing with Contrast in Mind

### Start with Accessible Colors

Build your color palette with accessibility from the start:

1. Choose your primary brand color
2. Find accessible text colors that work with it
3. Create a contrast matrix for all color combinations
4. Document which combinations are safe to use

### The 60-30-10 Rule with Accessibility

- **60%** - Dominant color (background)
- **30%** - Secondary color (must contrast with 60%)
- **10%** - Accent color (must contrast with wherever it's used)

## Beyond Color Alone

WCAG requires that color not be the only way to convey information:

**Bad:** "Required fields are in red"
**Good:** "Required fields are marked with an asterisk (*) and highlighted in red"

### Examples

- **Links:** Underline links, don't just change color
- **Errors:** Add icons or text, not just red borders
- **Charts:** Use patterns in addition to colors
- **Status indicators:** Add labels, not just colored dots

## Social Media Graphics

### Text on Images

When adding text to images:

1. Use solid or semi-transparent overlays behind text
2. Choose high-contrast color combinations
3. Test at mobile sizes (text gets smaller!)
4. Avoid placing text over busy image areas

### Accessible Color Palettes

Some accessible combinations for social graphics:

| Background | Text | Ratio |
|------------|------|-------|
| #1a1a2e | #ffffff | 15.3:1 ✅ |
| #16213e | #e8e8e8 | 11.5:1 ✅ |
| #0f3460 | #ffffff | 10.1:1 ✅ |
| #e94560 | #000000 | 5.2:1 ✅ |

## Testing Your Designs

### Simulation Tools

- **Color Oracle** - Simulates color blindness
- **NoCoffee** - Chrome extension for vision simulation
- **Photoshop** - View > Proof Setup > Color Blindness

### Real-World Testing

- View on different devices
- Test in bright light
- Ask users with disabilities for feedback
- Use automated accessibility checkers

## Quick Reference

### Safe Text Colors on White (#FFFFFF)

- Black (#000000) - 21:1 ✅
- Dark gray (#595959) - 7:1 ✅ AAA
- Medium gray (#767676) - 4.5:1 ✅ AA
- Avoid anything lighter than #767676

### Safe Text Colors on Black (#000000)

- White (#FFFFFF) - 21:1 ✅
- Light gray (#a6a6a6) - 7:1 ✅ AAA
- Medium gray (#898989) - 4.5:1 ✅ AA

## Conclusion

Color contrast isn't about limiting creativity—it's about ensuring your creative work reaches everyone. With the right tools and knowledge, you can create beautiful designs that are also accessible.

Start by auditing your current color palette, fix the obvious issues, and build accessibility into your design process from the start.`,
    metaTitle: 'Color Contrast: Foundation of Visual Accessibility | AccessAI',
    metaDescription: 'Learn WCAG color contrast requirements and how to create designs that everyone can see clearly, including those with low vision.',
    categorySlug: 'visual-design',
    tagSlugs: ['color-contrast', 'wcag', 'inclusive-design'],
    featured: true,
    readingTimeMinutes: 8,
  },
  {
    title: 'Keyboard Navigation: Making Your Content Accessible Without a Mouse',
    slug: 'keyboard-navigation-accessibility',
    excerpt: 'Learn how to ensure your content and websites work perfectly for users who navigate with keyboards instead of mice.',
    content: `# Keyboard Navigation: Making Your Content Accessible Without a Mouse

Not everyone uses a mouse. People with motor disabilities, repetitive strain injuries, or those who simply prefer keyboards rely on keyboard navigation. Making your content keyboard-accessible is essential for true inclusivity.

## Who Uses Keyboard Navigation?

- **People with motor disabilities** who cannot use a mouse
- **Screen reader users** who navigate primarily by keyboard
- **Power users** who prefer keyboard shortcuts
- **People with temporary injuries** affecting mouse use
- **Users of alternative input devices** that emulate keyboards

## The Basics of Keyboard Navigation

### Essential Keys

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift + Tab | Move to previous element |
| Enter | Activate links and buttons |
| Space | Activate buttons, toggle checkboxes |
| Arrow keys | Navigate within components |
| Escape | Close dialogs, cancel actions |

### Focus Indicators

The focus indicator (usually a blue outline) shows users where they are on the page. **Never remove focus indicators** without providing an alternative.

\`\`\`css
/* Bad - removes all focus indicators */
*:focus { outline: none; }

/* Good - custom focus indicator */
*:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
\`\`\`

## Common Keyboard Accessibility Issues

### 1. Missing Focus States

If you can't see where focus is, keyboard navigation becomes impossible.

**Fix:** Ensure all interactive elements have visible focus states.

### 2. Keyboard Traps

Users get stuck in a component and can't Tab out of it.

**Fix:** Ensure users can always navigate away using Tab or Escape.

### 3. Illogical Tab Order

Focus jumps around the page unpredictably.

**Fix:** Ensure DOM order matches visual order. Avoid positive tabindex values.

### 4. Non-Focusable Interactive Elements

Clickable divs or spans that aren't keyboard accessible.

**Fix:** Use proper semantic elements (button, a) or add tabindex="0" and keyboard event handlers.

### 5. Missing Skip Links

Users must Tab through every navigation item to reach main content.

**Fix:** Add a "Skip to main content" link at the top of the page.

## Implementing Keyboard Accessibility

### Semantic HTML

Use the right elements for the right purpose:

\`\`\`html
<!-- Bad: div pretending to be a button -->
<div onclick="doSomething()">Click me</div>

<!-- Good: actual button -->
<button onclick="doSomething()">Click me</button>
\`\`\`

### Custom Components

When building custom components, ensure they're keyboard accessible:

\`\`\`javascript
// Handle both click and keyboard activation
element.addEventListener('click', handleAction);
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleAction();
  }
});
\`\`\`

### Modal Dialogs

Modals require special keyboard handling:

1. Trap focus within the modal
2. Return focus to trigger element when closed
3. Close on Escape key
4. Focus the first focusable element when opened

## Testing Keyboard Accessibility

### Manual Testing Checklist

1. [ ] Can you reach all interactive elements with Tab?
2. [ ] Is focus always visible?
3. [ ] Does Tab order make logical sense?
4. [ ] Can you activate all buttons and links with Enter/Space?
5. [ ] Can you escape from all components?
6. [ ] Do dropdown menus work with arrow keys?
7. [ ] Can you skip repetitive navigation?

### Automated Testing

Tools like axe DevTools and WAVE can catch some keyboard issues, but manual testing is essential.

## Social Media Considerations

### Platform Accessibility

Most social media platforms have reasonable keyboard support, but your content should enhance it:

- **Don't rely on hover states** for important information
- **Provide text alternatives** for interactive content
- **Test your links** to ensure they're properly formatted

### Accessible Calls to Action

Instead of "Click the link below," use "Visit the link below" or "Select the link below"—language that doesn't assume mouse use.

## Advanced Patterns

### Roving Tabindex

For component groups like toolbars, use roving tabindex:

\`\`\`html
<div role="toolbar">
  <button tabindex="0">Bold</button>
  <button tabindex="-1">Italic</button>
  <button tabindex="-1">Underline</button>
</div>
\`\`\`

Arrow keys move between buttons, Tab moves to the next component.

### Focus Management in SPAs

Single-page applications need careful focus management:

- Move focus to new content after navigation
- Announce page changes to screen readers
- Maintain focus position when content updates

## Quick Wins

1. **Add skip links** - 5 minutes of work, huge impact
2. **Check focus visibility** - Ensure outlines aren't removed
3. **Use semantic HTML** - Buttons for actions, links for navigation
4. **Test with Tab key** - Spend 5 minutes tabbing through your site

## Conclusion

Keyboard accessibility is foundational to web accessibility. When your content works with a keyboard, it works with screen readers, voice control, switch devices, and many other assistive technologies.

Start by testing your own content with just a keyboard. You'll quickly discover issues you never knew existed—and fixing them benefits everyone.`,
    metaTitle: 'Keyboard Navigation Accessibility Guide | AccessAI',
    metaDescription: 'Learn how to make your content accessible for users who navigate with keyboards, including focus management and testing tips.',
    categorySlug: 'accessibility-basics',
    tagSlugs: ['keyboard-navigation', 'wcag', 'inclusive-design'],
    featured: false,
    readingTimeMinutes: 7,
  },
  {
    title: 'Creating Accessible Social Media Images',
    slug: 'accessible-social-media-images',
    excerpt: 'A comprehensive guide to creating images for social media that are accessible to everyone, including those with visual impairments.',
    content: `# Creating Accessible Social Media Images

Images are the currency of social media. But for millions of users with visual impairments, poorly designed images mean missed content and excluded communities. Here's how to create images that everyone can enjoy.

## The Accessibility Mindset

Before you design, ask yourself:

1. Can someone understand this without seeing the colors?
2. Is the text readable at mobile sizes?
3. Does the alt text convey the full message?
4. Would this work for someone with color blindness?

## Text in Images

### Font Size Guidelines

| Platform | Minimum Font Size |
|----------|------------------|
| Instagram | 30px |
| Twitter/X | 24px |
| LinkedIn | 28px |
| Facebook | 26px |

Remember: these are minimums. Bigger is almost always better.

### Font Choice

- **Use sans-serif fonts** for better screen readability
- **Avoid decorative fonts** for important information
- **Limit to 2 font families** per image
- **Use bold for emphasis** instead of italics

### Text Contrast

Always ensure text has sufficient contrast with its background:

- Add solid color overlays behind text
- Use drop shadows or outlines for text on photos
- Test with contrast checking tools

## Color Accessibility

### Color Blindness Considerations

8% of men and 0.5% of women have some form of color blindness. Design for them:

- **Don't rely on color alone** to convey meaning
- **Use patterns or icons** in addition to colors
- **Test with color blindness simulators**

### Safe Color Combinations

| Type | Avoid | Use Instead |
|------|-------|-------------|
| Red-Green | Red vs Green | Red vs Blue, Orange vs Blue |
| Blue-Yellow | Blue vs Yellow | Blue vs Orange, Purple vs Yellow |
| All types | Pastels together | High contrast combinations |

## Image Composition

### Visual Hierarchy

Guide the viewer's eye with clear hierarchy:

1. **Primary message** - Largest, most prominent
2. **Supporting information** - Medium size
3. **Call to action** - Clear and distinct
4. **Branding** - Consistent but not overwhelming

### White Space

Don't cram everything together. White space:

- Improves readability
- Reduces cognitive load
- Makes content more scannable
- Helps users with attention disorders

## Alt Text for Social Images

### Writing Effective Alt Text

Every social media image should have alt text. Here's how to write it:

**For informational images:**
"Infographic showing 5 steps to accessible design: 1) Use sufficient contrast, 2) Add alt text, 3) Use semantic HTML, 4) Enable keyboard navigation, 5) Test with real users"

**For promotional images:**
"AccessAI promotional banner featuring a diverse group of content creators with text: Create Inclusive Content - Try Free Today"

**For quote graphics:**
"Quote by Maya Angelou on purple gradient background: 'People will forget what you said, people will forget what you did, but people will never forget how you made them feel.'"

### Platform-Specific Alt Text

| Platform | How to Add Alt Text |
|----------|-------------------|
| Twitter/X | Edit image > Add description |
| Instagram | Advanced settings > Write alt text |
| LinkedIn | Add alt text when uploading |
| Facebook | Edit > Alternative text |

## Infographics and Data Visualization

### Making Charts Accessible

1. **Use patterns** in addition to colors
2. **Label data directly** instead of using legends
3. **Provide data tables** as alternatives
4. **Write descriptive alt text** summarizing key findings

### Infographic Best Practices

- **Linear reading order** - Top to bottom, left to right
- **Numbered sections** - Help users follow the flow
- **Sufficient contrast** - Between all elements
- **Text alternatives** - Provide full content in post text

## Templates and Consistency

### Creating Accessible Templates

Build accessibility into your templates:

1. Pre-defined accessible color palette
2. Minimum font sizes enforced
3. Contrast-checked text areas
4. Alt text prompts in your workflow

### Brand Consistency

Accessible design can still be on-brand:

- Define accessible versions of brand colors
- Create accessible typography guidelines
- Build an accessible asset library
- Train team members on accessibility

## Tools for Accessible Design

### Design Tools

- **Canva** - Has accessibility checker
- **Figma** - Stark plugin for accessibility
- **Adobe Express** - Built-in accessibility features

### Checking Tools

- **Colour Contrast Analyser** - Check contrast ratios
- **Color Oracle** - Simulate color blindness
- **WAVE** - Web accessibility evaluation

## Quick Checklist

Before posting any image:

- [ ] Text is large enough to read on mobile
- [ ] Contrast ratio meets WCAG AA (4.5:1)
- [ ] Color isn't the only way to convey information
- [ ] Alt text is written and descriptive
- [ ] Image works in grayscale
- [ ] Important text isn't cut off at edges

## Conclusion

Accessible social media images aren't just about compliance—they're about reaching your full audience. When you design with accessibility in mind, you create content that works better for everyone.

Start with one change: add alt text to every image you post. Then gradually incorporate more accessibility practices into your design workflow. Your audience—all of your audience—will thank you.`,
    metaTitle: 'Creating Accessible Social Media Images | AccessAI',
    metaDescription: 'Learn how to create social media images that are accessible to everyone, including proper contrast, text sizing, and alt text.',
    categorySlug: 'social-media',
    tagSlugs: ['alt-text', 'color-contrast', 'inclusive-design', 'instagram', 'twitter', 'linkedin'],
    featured: false,
    readingTimeMinutes: 8,
  },
  {
    title: 'Writing Inclusive Content: Language That Welcomes Everyone',
    slug: 'writing-inclusive-content',
    excerpt: 'Learn how to write content that respects and includes people of all abilities, backgrounds, and identities.',
    content: `# Writing Inclusive Content: Language That Welcomes Everyone

The words we choose matter. Inclusive language isn't about political correctness—it's about ensuring everyone feels welcome and represented in your content. Here's how to write content that truly includes everyone.

## Why Inclusive Language Matters

- **1 in 4 adults** in the US has a disability
- **40% of the population** identifies as non-white
- **5.6% of adults** identify as LGBTQ+
- Your audience is more diverse than you think

When people see themselves represented in your content, they engage more, trust you more, and become loyal followers.

## Person-First vs. Identity-First Language

This is nuanced and varies by community:

### Person-First Language
Emphasizes the person before the disability:
- "Person with a disability" not "disabled person"
- "Person who uses a wheelchair" not "wheelchair-bound"
- "Person with autism" not "autistic person"

### Identity-First Language
Some communities prefer identity-first:
- Many autistic adults prefer "autistic person"
- Many Deaf individuals prefer "Deaf person"
- Many blind individuals prefer "blind person"

**Best practice:** When in doubt, ask. When you can't ask, use person-first language or mirror the language your audience uses.

## Disability Language Guide

### Words to Avoid and Alternatives

| Avoid | Use Instead |
|-------|-------------|
| Handicapped | Disabled, person with a disability |
| Wheelchair-bound | Wheelchair user, uses a wheelchair |
| Suffers from | Has, lives with |
| Victim of | Person with, survivor of |
| Normal (vs. disabled) | Non-disabled, typical |
| Special needs | Disability, access needs |
| Mentally retarded | Intellectual disability |
| Crazy, insane | Unexpected, surprising, intense |
| Lame | Boring, uncool, weak |
| Blind (as metaphor) | Unaware, ignorant |

### Positive Framing

Avoid inspiration porn—portraying disabled people as inspirational simply for living their lives.

**Avoid:** "Despite her disability, she achieved..."
**Better:** "She achieved..." (disability may not be relevant)

## Gender-Inclusive Language

### Avoiding Gendered Assumptions

| Instead of | Use |
|------------|-----|
| Guys, ladies | Everyone, folks, team, y'all |
| Mankind | Humanity, humankind, people |
| Man-made | Artificial, synthetic, manufactured |
| Manpower | Workforce, staff, personnel |
| Chairman | Chair, chairperson |
| He/she | They, the person, the user |

### Pronouns

- Use "they/them" as a singular pronoun when gender is unknown
- Include your pronouns in your bio to normalize the practice
- Respect people's stated pronouns

## Cultural Sensitivity

### Avoiding Stereotypes

- Don't make assumptions about someone's background
- Avoid cultural stereotypes in examples and imagery
- Represent diverse perspectives authentically

### Inclusive Examples

When giving examples, vary the names and scenarios:

**Less inclusive:** "When John creates a post, he should..."
**More inclusive:** "When you create a post, you should..." or use diverse names

## Age-Inclusive Language

| Avoid | Use Instead |
|-------|-------------|
| Elderly, old | Older adults, seniors |
| Young people don't... | Some people don't... |
| Digital natives | People comfortable with technology |
| OK Boomer | (Just don't) |

## Socioeconomic Sensitivity

Be mindful of assumptions about:

- Access to technology
- Financial resources
- Educational background
- Geographic location

**Avoid:** "Everyone has a smartphone"
**Better:** "If you have access to a smartphone"

## Writing for Global Audiences

### Cultural Considerations

- Avoid idioms that don't translate
- Be careful with humor—it doesn't always cross cultures
- Consider different date formats, currencies, and measurements
- Avoid assumptions about holidays or cultural practices

### Plain Language

- Use simple, clear language
- Avoid jargon and acronyms
- Define technical terms
- Use short sentences and paragraphs

## Practical Tips

### Review Your Content

Before publishing, ask:

1. Would anyone feel excluded by this language?
2. Am I making assumptions about my audience?
3. Are my examples diverse and representative?
4. Would this make sense to someone from a different background?

### Build Inclusive Habits

- Create a style guide with inclusive language guidelines
- Use tools like Alex.js to catch insensitive language
- Get feedback from diverse reviewers
- Stay updated—language evolves

### When You Make Mistakes

Everyone makes mistakes. When you do:

1. Acknowledge the error
2. Apologize sincerely
3. Correct the content
4. Learn for the future

## Inclusive Content Checklist

- [ ] Language is person-first (or identity-first where preferred)
- [ ] No ableist metaphors or phrases
- [ ] Gender-neutral language where appropriate
- [ ] Diverse examples and representation
- [ ] No cultural stereotypes
- [ ] Plain language accessible to all
- [ ] Assumptions about audience are minimized

## Conclusion

Inclusive language is a practice, not a destination. You won't get it perfect every time, and that's okay. What matters is the commitment to continuous improvement and genuine respect for all members of your audience.

Start by auditing your existing content, create guidelines for your future content, and stay open to feedback. Your audience will notice—and appreciate—the effort.`,
    metaTitle: 'Writing Inclusive Content: Language That Welcomes Everyone | AccessAI',
    metaDescription: 'Learn how to write content that respects and includes people of all abilities, backgrounds, and identities with this comprehensive guide.',
    categorySlug: 'accessibility-basics',
    tagSlugs: ['inclusive-design', 'wcag'],
    featured: false,
    readingTimeMinutes: 9,
  },
  {
    title: 'Video Accessibility: Captions, Transcripts, and Audio Descriptions',
    slug: 'video-accessibility-captions-transcripts',
    excerpt: 'Make your video content accessible to deaf, hard of hearing, and blind audiences with captions, transcripts, and audio descriptions.',
    content: `# Video Accessibility: Captions, Transcripts, and Audio Descriptions

Video is the dominant content format on social media, but it's also one of the least accessible. Here's how to ensure your video content reaches everyone.

## Why Video Accessibility Matters

- **466 million people** worldwide have disabling hearing loss
- **2.2 billion people** have vision impairment
- **85% of Facebook videos** are watched without sound
- **80% of viewers** are more likely to watch a video with captions

Video accessibility isn't just about disability—it's about reaching your full audience.

## Captions: The Foundation

### Types of Captions

**Closed Captions (CC)**
- Can be turned on/off by viewer
- Stored as separate file or track
- Can be styled by viewer preferences

**Open Captions**
- Burned into the video
- Always visible
- Consistent appearance

**Subtitles**
- Translation of dialogue
- Assume viewer can hear
- Don't include sound effects

### Caption Best Practices

1. **Accuracy** - 99% accuracy is the goal
2. **Synchronization** - Captions should match audio timing
3. **Completeness** - Include all spoken content and relevant sounds
4. **Readability** - Use proper punctuation and line breaks

### What to Include in Captions

- All spoken dialogue
- Speaker identification when not obvious
- Relevant sound effects [door slams]
- Music descriptions [upbeat jazz music]
- Tone indicators [sarcastically] when meaning would be lost

### Caption Formatting

\`\`\`
[Upbeat music playing]

SARAH: Welcome to today's accessibility tip!

[Sound of keyboard typing]

SARAH: Let me show you how to add alt text...
\`\`\`

## Auto-Captions: A Starting Point

Most platforms offer auto-generated captions. They're better than nothing, but:

- Accuracy is typically 60-80%
- They miss proper nouns and technical terms
- They don't include sound effects
- They may have timing issues

**Always review and edit auto-captions.**

### Platform Caption Features

| Platform | Auto-Captions | Upload Captions | Edit Captions |
|----------|--------------|-----------------|---------------|
| YouTube | ✅ | ✅ | ✅ |
| Facebook | ✅ | ✅ | ✅ |
| Instagram | ✅ (Reels) | ❌ | Limited |
| TikTok | ✅ | ❌ | ✅ |
| LinkedIn | ✅ | ✅ | ✅ |
| Twitter/X | ❌ | ❌ | ❌ |

## Transcripts: The Complete Record

Transcripts are text versions of your entire video content. They benefit:

- Deaf and hard of hearing viewers
- People who prefer reading
- Search engines (SEO boost!)
- People in sound-sensitive environments

### Transcript Format

A good transcript includes:

\`\`\`
VIDEO TITLE: Introduction to Accessible Design
DURATION: 5:32
DATE: January 15, 2024

[Video opens with animated logo]

NARRATOR: Welcome to AccessAI's guide to accessible design.

[Screen shows website homepage]

NARRATOR: Today we'll cover three key principles...

[Text on screen: 1. Perceivable 2. Operable 3. Understandable]
\`\`\`

### Where to Put Transcripts

- In the video description
- On a linked webpage
- In a downloadable document
- In a blog post accompanying the video

## Audio Descriptions

Audio descriptions narrate visual information for blind and low-vision viewers.

### What Needs Description

- Visual actions not explained by dialogue
- On-screen text
- Scene changes
- Character appearances and expressions
- Important visual details

### Types of Audio Description

**Standard Audio Description**
Fits descriptions into natural pauses in dialogue.

**Extended Audio Description**
Pauses the video to allow for longer descriptions.

### Writing Audio Descriptions

**Principles:**
- Describe what you see, not what you interpret
- Be concise—fit into available time
- Prioritize essential visual information
- Use present tense

**Example:**
"Sarah points to the screen where a colorful pie chart shows engagement metrics. The largest slice, in blue, represents LinkedIn at 45%."

## Creating Accessible Video Content

### Pre-Production

1. **Script for accessibility** - Include visual descriptions in your script
2. **Plan for captions** - Leave space for caption placement
3. **Consider audio-only understanding** - Would the video make sense without visuals?

### Production

1. **Clear audio** - Use good microphones, minimize background noise
2. **Visible speakers** - Show faces for lip-reading
3. **Avoid flashing** - No more than 3 flashes per second
4. **Contrast** - Ensure text is readable

### Post-Production

1. **Add accurate captions** - Review auto-captions carefully
2. **Create transcript** - Full text version
3. **Add audio descriptions** - If visual content is essential
4. **Test accessibility** - Watch with sound off, listen without watching

## Quick Wins for Video Accessibility

### Immediate Actions

1. **Enable auto-captions** on all platforms
2. **Review and edit** auto-generated captions
3. **Add transcripts** to video descriptions
4. **Describe visuals** in your narration

### Building Good Habits

- Write scripts that work as audio-only content
- Include visual descriptions in your speaking
- Always review captions before publishing
- Create transcript templates for efficiency

## Tools for Video Accessibility

### Caption Tools

- **YouTube Studio** - Free, built-in editing
- **Rev** - Professional captioning service
- **Otter.ai** - AI transcription with editing
- **Kapwing** - Free caption editor

### Audio Description Tools

- **YouDescribe** - Free audio description platform
- **Descriptive Video Works** - Professional service

## Accessibility Checklist for Video

Before publishing:

- [ ] Captions are accurate and synchronized
- [ ] All spoken content is captioned
- [ ] Sound effects and music are described
- [ ] Transcript is available
- [ ] Visual-only information is described in audio
- [ ] No rapid flashing (seizure risk)
- [ ] Audio is clear and understandable

## Conclusion

Video accessibility requires effort, but the payoff is enormous. You'll reach more viewers, improve engagement, boost SEO, and create content that truly includes everyone.

Start with captions—they're the foundation. Then add transcripts for SEO and accessibility. Finally, consider audio descriptions for content where visuals are essential.

Every accessible video is a step toward a more inclusive internet.`,
    metaTitle: 'Video Accessibility: Captions & Transcripts | AccessAI',
    metaDescription: 'Learn how to make video content accessible with captions, transcripts, and audio descriptions for deaf, hard of hearing, and blind audiences.',
    categorySlug: 'accessibility-basics',
    tagSlugs: ['captions', 'wcag', 'inclusive-design'],
    featured: false,
    readingTimeMinutes: 10,
  },
];

async function seedBlog() {
  console.log('🌱 Starting blog seed...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    const connection = await createConnection(databaseUrl);
    const db = drizzle(connection);

    // Seed categories
    console.log('📁 Seeding categories...');
    for (const category of categories) {
      await connection.execute(
        `INSERT INTO blog_categories (name, slug, description, createdAt) 
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [category.name, category.slug, category.description]
      );
      console.log(`  ✓ ${category.name}`);
    }

    // Seed tags
    console.log('\n🏷️  Seeding tags...');
    for (const tag of tags) {
      await connection.execute(
        `INSERT INTO blog_tags (name, slug, createdAt) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [tag.name, tag.slug]
      );
      console.log(`  ✓ ${tag.name}`);
    }

    // Get category and tag IDs
    const [categoryRows] = await connection.execute('SELECT id, slug FROM blog_categories');
    const categoryMap = Object.fromEntries(categoryRows.map(r => [r.slug, r.id]));

    const [tagRows] = await connection.execute('SELECT id, slug FROM blog_tags');
    const tagMap = Object.fromEntries(tagRows.map(r => [r.slug, r.id]));

    // Get admin user (first user or owner)
    const [userRows] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    const authorId = userRows.length > 0 ? userRows[0].id : 1;

    // Seed articles
    console.log('\n📝 Seeding articles...');
    for (const article of articles) {
      const categoryId = categoryMap[article.categorySlug];
      
      // Insert article
      const [result] = await connection.execute(
        `INSERT INTO blog_posts (title, slug, content, excerpt, metaTitle, metaDescription, 
         authorId, categoryId, status, featured, readingTimeMinutes, viewCount, 
         publishedAt, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, 0, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         title = VALUES(title), content = VALUES(content), excerpt = VALUES(excerpt),
         metaTitle = VALUES(metaTitle), metaDescription = VALUES(metaDescription),
         updatedAt = NOW()`,
        [
          article.title,
          article.slug,
          article.content,
          article.excerpt,
          article.metaTitle,
          article.metaDescription,
          authorId,
          categoryId,
          article.featured ? 1 : 0,
          article.readingTimeMinutes,
        ]
      );

      // Get the post ID
      const [postRows] = await connection.execute(
        'SELECT id FROM blog_posts WHERE slug = ?',
        [article.slug]
      );
      const postId = postRows[0]?.id;

      if (postId) {
        // Link tags
        for (const tagSlug of article.tagSlugs) {
          const tagId = tagMap[tagSlug];
          if (tagId) {
            await connection.execute(
              `INSERT IGNORE INTO blog_post_tags (postId, tagId) VALUES (?, ?)`,
              [postId, tagId]
            );
          }
        }
      }

      console.log(`  ✓ ${article.title}`);
    }

    await connection.end();

    console.log('\n✅ Blog seed completed successfully!');
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${tags.length} tags`);
    console.log(`   - ${articles.length} articles`);

  } catch (error) {
    console.error('❌ Error seeding blog:', error);
    process.exit(1);
  }
}

seedBlog();
