# Email Builder Application - Complete User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Main Interface](#main-interface)
4. [Main Tabs](#main-tabs)
5. [Block Types & Configuration](#block-types--configuration)
6. [Inspector Drawer](#inspector-drawer)
7. [View Modes](#view-modes)
8. [Import & Export](#import--export)
9. [Global Email Settings](#global-email-settings)
10. [Tips & Best Practices](#tips--best-practices)

---

## Overview

The Email Builder is a visual, browser-based application for designing professional emails without coding. It uses a block-based architecture where you compose emails by selecting, arranging, and customising content blocks (text, images, buttons, etc.). The application provides:

- **Live editor** with real-time preview
- **Multiple view modes** (Editor, Preview, HTML, JSON)
- **Responsive design** support (Desktop/Mobile views)
- **Import/Export** functionality (JSON format)
- **Inspector drawer** for detailed block configuration
- **Global styling** options for consistent design

---

## Getting Started

### 1. Launch the Application
Open the Email Builder in your browser. The application loads with a default email layout and empty canvas.

### 2. Main Canvas Area
- The central area displays your email on a white canvas
- The canvas has a grey backdrop to simulate email client display
- Click on any block to select it for editing
- Use the **Inspector Drawer** on the right to configure selected blocks

### 3. Basic Workflow
1. Select a block from the canvas or toolbar
2. View its properties in the Inspector Drawer
3. Adjust styles in the **Styles** tab or properties in the **Inspect** tab
4. Preview your email in the **Preview** tab
5. Export as JSON or HTML when complete

---

## Main Interface

### Top Toolbar

The top bar contains several key controls:

#### **Main Tabs** (Left side)
Four icon buttons control what you're viewing:
- **Editor** - Edit mode (default). Interact with blocks, add/remove elements
- **Preview** - Read-only preview mode. See how email looks to recipients
- **HTML** - View generated HTML code
- **JSON** - View document structure as JSON

#### **Screen Size Toggle** (Right side)
- **Desktop** - View at full 600px or 900px width (configured in Global settings)
- **Mobile** - View at mobile width (370px) with phone-like frame

#### **Import/Export Buttons** (Right side)
- **Upload icon** - Import a JSON configuration
- **Download icon** - Export current email as JSON

#### **Inspector Toggle Button**
- Opens/closes the Inspector Drawer on the right side

---

## Main Tabs

### 1. Editor Tab 
**Active by default** - This is where you build your email.

**Features:**
- Click on any block to select it
- Selected blocks show a blue highlight border
- A context menu may appear for block-specific actions
- Add new blocks via menu or drag-and-drop
- Reorder blocks by dragging

**Status:** You can edit the document in this view

---

### 2. Preview Tab 
**Read-only view** - Shows how your email looks to recipients.

**Features:**
- No editing controls visible
- No selection overlays
- Displays final rendered HTML
- No Inspector Drawer access
- Reflects all styles and content exactly as it will appear

**Use case:** Verify visual design before exporting

---

### 3. HTML Tab 
**HTML output view** - Shows the generated HTML code.

**Features:**
- Displays complete HTML markup
- Read-only code display
- Reflects all current styles and configurations
- Useful for:
  - Verifying email code structure
  - Copying HTML for manual email systems
  - Understanding how email will render
  - Debugging style issues

**Note:** This is generated dynamically from your block structure

---

### 4. JSON Tab 
**JSON output view** - Shows your email as structured data.

**Features:**
- Displays complete JSON configuration
- Read-only view
- Shows block hierarchy and all properties
- Useful for:
  - Understanding document structure
  - Creating templates programmatically
  - Version control/diff comparison
  - API integration

**Structure:**
```json
{
  "root": { "type": "EmailLayout", "data": { ... } },
  "block-id-1": { "type": "Text", "data": { ... } },
  "block-id-2": { "type": "Button", "data": { ... } },
  ...
}
```

---

## Block Types & Configuration

Each block type has unique properties accessible in the **Inspector Drawer** under the **Inspect** tab.

### 1. **Email Layout** (Root Block)
**Purpose:** Container for entire email. Sets global appearance.

**Configuration Options:**
- **Backdrop colour** - Background colour behind the email canvas
- **Canvas colour** - Main background colour of email content
- **Canvas border colour** (optional) - Border around entire email
- **Canvas border radius** - Corner rounding of email container
- **Canvas width** - Email width: Standard (600px) or Wide (900px)
- **Font family** - Default typeface for entire email
- **Text colour** - Default text colour

**When to use:**
- Set global typography preferences
- Adjust colour scheme for consistency
- Configure email container dimensions

**Styles:**
- Access via **Styles** tab in Inspector
- Affects overall layout appearance

---

### 2. **Text Block**
**Purpose:** Add plain text or markdown content.

**Configuration Options (Inspect tab):**
- **Content** - The text to display (supports markdown)
- **Markdown** - Enable/disable markdown rendering
- **Colour** - Text colour
- **Background colour** - Background colour
- **Font family** - Typeface
- **Font size** - Size in px
- **Font weight** - Bold/normal/light
- **Text align** - Left/centre/right alignment
- **Padding** - Space inside the block

**Example uses:**
- Body paragraphs
- Information text
- Descriptions

**Tips:**
- Use markdown for formatting (bold: `**text**`, italic: `*text*`)
- Keep text concise for email-friendly content

---

### 3. **Heading Block**
**Purpose:** Create section headers with emphasis.

**Configuration Options:**
- **Content** - The heading text
- **Level** - H1, H2, or H3 (semantic heading level)
- **Colour** - Text colour
- **Background colour** - Background colour
- **Font family** - Typeface
- **Font weight** - Bold/normal/light
- **Text align** - Left/centre/right
- **Padding** - Internal spacing

**Example uses:**
- Section titles
- Email subject lines (styled as headings)
- Campaign names

**Tips:**
- H1 for main email title
- H2 for section breaks
- H3 for subsections

---

### 4. **Button Block**
**Purpose:** Interactive call-to-action elements.

**Configuration Options:**
- **Text** - Button label
- **URL** - Link destination (e.g., `https://example.com`)
- **Width** - Full width or auto-sized
- **Size** - Extra small, small, medium, large
- **Style** - Rectangle, rounded, or pill shape
- **Text colour** - Button text colour
- **Background colour** - Button background colour

**Example uses:**
- Call-to-action buttons ("Shop Now", "Learn More")
- Click-through links in promotions
- Signup/registration buttons

**Tips:**
- Keep button text short (2-3 words)
- Use contrasting colours for visibility
- Test click area on mobile devices

---

### 5. **Image Block**
**Purpose:** Add and configure images.

**Configuration Options:**
- **Image upload** - Click to upload image file
- **Alt text** - Description for accessibility (important!)
- **Width** - Image width in px
- **Height** - Image height in px
- **Alignment** - Top/middle/bottom vertical alignment
- **Background colour** - Background colour

**Upload Process:**
1. Click the file input area
2. Select an image from your computer
3. Wait for upload to complete (shows "uploading..." status)
4. Image URL is automatically set

**Example uses:**
- Hero images
- Product photos
- Logos
- Illustrations

**Tips:**
- Use optimised images (compress before upload)
- Always provide descriptive alt text
- Specify dimensions for consistent rendering
- Max recommended width: 600px

---

### 6. **Avatar Block**
**Purpose:** Display circular profile images.

**Configuration Options:**
- **Image upload** - Upload avatar photo
- **Size** - Avatar diameter in px (50-300px)
- **Alt text** - Image description
- **Shape** - Circle or square

**Example uses:**
- Author/sender profile pictures
- Team member profiles
- Contributor images

**Tips:**
- Use square source images for circular avatars
- Keep size consistent across email
- Avatars typically 60-100px diameter

---

### 7. **Container Block**
**Purpose:** Group and style related content.

**Configuration Options:**
- **Background colour** - Container background
- **Border colour** (optional) - Border colour
- **Border radius** - Corner rounding
- **Padding** - Internal spacing

**Example uses:**
- Group related blocks with shared background
- Create coloured content sections
- Highlight important information

**Tips:**
- Use containers to organise visual sections
- Combine with text/image blocks inside
- Apply background colours for emphasis

---

### 8. **Columns Container Block**
**Purpose:** Layout content in multiple columns (2 or 3).

**Configuration Options:**
- **Number of columns** - 2 or 3 columns
- **Column widths** - Custom width for each column
- **Columns gap** - Space between columns (px)
- **Alignment** - Vertical alignment (top/middle/bottom)
- **Background colour** - Container background
- **Padding** - Internal spacing

**Example uses:**
- Side-by-side product displays
- Multi-column content layouts
- Feature comparison tables

**Tips:**
- Adjust gap for better readability
- Use equal widths for balanced layout
- Test column layout on mobile view

---

### 9. **Divider Block**
**Purpose:** Visual separator between sections.

**Configuration Options:**
- **Colour** - Line colour
- **Height** - Line thickness (1-24px)
- **Background colour** - Background around divider
- **Padding** - Space around divider

**Example uses:**
- Section breaks
- Visual separation
- Content organisation

**Tips:**
- Use subtle colours (greys)
- Height 1-3px typically looks best
- Add padding for visual breathing room

---

### 10. **Spacer Block**
**Purpose:** Add vertical whitespace between elements.

**Configuration Options:**
- **Height** - Space in px
- **Background colour** - Colour of spacer area

**Example uses:**
- Add breathing room between sections
- Adjust vertical alignment
- Create visual hierarchy

**Tips:**
- Use 16-32px typically
- Combine multiple spacers for larger gaps

---

### 11. **Rich Text Block**
**Purpose:** Advanced text editor with formatting tools.

**Configuration Options:**
The Rich Text Editor provides a toolbar with:

**Text Formatting:**
- **Bold** - Make text bold
- **Italic** - Make text italic
- **Underline** - Underline text
- **Clear formatting** - Remove all styles

**Lists:**
- **Bulleted list** - Create bullet points
- **Numbered list** - Create ordered list

**Links:**
- **Link button** - Add clickable hyperlinks
  - Dialog appears to enter URL
  - Validates URL format
  - Supports http/https only

**Colours:**
- **Text colour** - Change text colour
- **Highlight colour** - Background highlight colour

**Block Styles:**
- **Font family** - Typeface selection
- **Font size** - Text size in px
- **Text colour** - Text color
- **Background colour** - Block background
- **Text alignment** - Left/centre/right

**Example uses:**
- Newsletter content with mixed formatting
- FAQ sections with numbered lists
- Terms & conditions with styled text
- Promotional copy with highlights

**Tips:**
- Keep formatting clean and minimal
- Use bold/italic sparingly
- Numbered lists for steps/instructions
- Bulleted lists for features/benefits

---

### 12. **Signature Block**
**Purpose:** Add professional signature sections.

**Configuration Options:**
- **Avatar image** - Optional profile photo
- **Avatar size** - Size in px
- **Name** - Full name
- **Title** - Job title/role
- **Company** - Company name
- **Image upload** - Upload signature image

**Example uses:**
- Email signatures
- Team member profiles
- Author credentials

**Tips:**
- Keep signatures compact
- Use professional images
- Include title for credibility

---

### 13. **HTML Block**
**Purpose:** Add custom HTML code (advanced).

**Configuration Options:**
- **HTML content** - Raw HTML code input
- Only for users comfortable with HTML

**Example uses:**
- Custom styling/effects
- Embedded content
- Legacy HTML templates

**Warning:**
- HTML is rendered as-is
- Use with caution - may break email rendering
- Test thoroughly in preview

---

## Inspector Drawer

Located on the right side of the application, the Inspector Drawer provides detailed configuration for selected blocks.

### Opening/Closing
- Click the toggle button (top-right, "Inspector" icon) to open/close
- Inspector hides when no block is selected

### Two Tabs

#### **Inspect Tab** (Active by default)
Shows block-specific properties:

**When no block is selected:**
- Message: "Click on a block to inspect."
- Select any block to see its options

**When a block is selected:**
- Block type displays as title (e.g., "Button block")
- All configuration fields for that block type appear
- Changes save immediately to document

**Common fields across blocks:**
- Text content inputs
- Colour pickers
- Toggle buttons
- Slider controls
- Dropdown selectors
- Text inputs with validation

---

#### **Styles Tab**
Global email styling (only configurable for Email Layout):

**Available style properties:**
- **Colour** - Text colour
- **Background Colour** - Background colour
- **Font Family** - Typeface selection
- **Font Size** - Text size
- **Font Weight** - Bold/normal/light
- **Text Align** - Left/centre/right
- **Padding** - Internal spacing
- **Border Colour** - Border colour
- **Border Radius** - Corner rounding

**Note:** Click on the Email Layout (root) block to access these global settings.

---

### Configuration Workflow

1. **Select a block** - Click any block in the editor view
   - Selected block shows blue highlight
   - Inspector updates to show that block's options

2. **Choose configuration** - Select the **Inspect** tab
   - Review all available options
   - Fields match the block type

3. **Update properties** - Modify values:
   - Text inputs: Type to change
   - Colour inputs: Click to open colour picker
   - Toggles: Click to switch on/off
   - Sliders: Drag or click to adjust numeric values
   - Dropdowns: Select from list

4. **See changes immediately**
   - Canvas updates in real-time
   - No "save" button needed
   - Changes persist as you edit

5. **Switch blocks** - Click another block to inspect it
   - Inspector updates to new block's properties
   - Previous block's changes are saved

---

## View Modes

### Desktop View (Default)
- Email displays at configured width (600px or 900px)
- Full editor controls visible
- Shows actual email width in email clients

**Toggle via:** Desktop button in top-right toolbar

### Mobile View
- Email displays at 370px width (mobile phone size)
- Shown in phone-like frame for reference
- Centre-aligned on screen with shadow effect

**When to use:**
- Test responsive design
- Verify mobile email rendering
- Check text readability on phones
- Ensure buttons are tap-friendly

**Toggle via:** Mobile button in top-right toolbar

**Mobile-specific considerations:**
- Text remains readable at 370px
- Buttons should be tap-sized (min 44px height)
- Columns may stack on mobile
- Images scale responsively

---

## Import & Export

### Export as JSON

**Purpose:** Save your email configuration as a JSON file for later import, sharing, or integration.

**Steps:**
1. Click the **download icon** in the top-right toolbar
2. "Download JSON" tooltip appears
3. Click to download file (browser handles save dialog)

**File format:**
```
emailTemplate.json
```

**Contents:**
- Complete email structure
- All block properties
- Global settings
- Colour schemes
- Typography

**Uses:**
- Backup your design
- Share templates with team
- Version control
- Integration with backend systems

---

### Import JSON

**Purpose:** Load a previously saved email configuration or template.

**Steps:**
1. Click the **upload icon** in the top-right toolbar
2. "Import JSON" tooltip appears
3. Click to open Import dialog
4. Dialog displays:
   - Text area for JSON paste or file selection
   - Validation feedback
   - Import button

**Two ways to import:**

**Option A: Paste JSON text**
1. Open the Import dialog
2. Paste JSON text into the text area
3. Click Import
4. System validates and loads

**Option B: Manual JSON entry**
1. Paste or type JSON in the dialog
2. System performs validation:
   - Checks JSON syntax
   - Validates block structure
   - Confirms required fields
3. Displays validation results
4. Click Import if valid

**Validation:**
- Invalid JSON shows error message
- Missing blocks shows "Block not found" error
- Invalid structure shows type mismatch errors
- Fix errors before importing

**After Import:**
- Current document is replaced
- All changes lost (if not exported first)
- View returns to Editor tab
- Email displays with imported configuration

---

### Template Management

**Saving templates:**
1. Design your email
2. Export as JSON (this is your template)
3. Save file with meaningful name (e.g., "newsletter-march.json")
4. Store in organised folder

**Using templates:**
1. Create new email (starts with default layout)
2. Click Import JSON
3. Select your template file
4. Email loads with template configuration
5. Modify as needed for specific use case

**Team templates:**
- Export team-standard templates
- Share JSON files via email, storage, etc.
- Team members import to maintain consistency
- Central template library (optional)

---

## Global Email Settings

Configure global appearance via the **Styles** tab in the Inspector Drawer.

### How to Access
1. Click on the white email canvas (not on any block)
2. Canvas itself becomes selected (blue border around entire email)
3. Inspector Drawer shows **Styles** tab content
4. This represents Email Layout global settings

### Available Global Settings

**Canvas Settings:**
- **Backdrop colour** - Colour behind email (typically grey or white)
- **Canvas colour** - Email background (typically white)
- **Canvas border colour** - Optional border around email edge
- **Canvas border radius** - Corner rounding (0-48px)
- **Canvas width** - Email width: 600px (standard) or 900px (wide)

**Typography Settings:**
- **Font family** - Default typeface for entire email:
  - Modern Sans (clean, contemporary)
  - Classic Serif (traditional, elegant)
  - System fonts (device-native rendering)
  - More options available in dropdown

**Colour Settings:**
- **Text colour** - Default text colour throughout email
- **Backdrop colour** - Area outside email canvas

### Font Family Options

The Email Builder includes carefully selected font families optimised for email:

**Considerations:**
- Each font has fallback options (multiple variants)
- Emails use web-safe fonts for compatibility
- All major email clients support selected fonts
- Font applies globally but can be overridden per-block

### Design Consistency

**Tips for consistent design:**
1. Set global font family first
2. Choose colour scheme:
   - Backdrop, canvas, text colours
   - Match brand guidelines
3. Select canvas width for device targeting:
   - 600px: Most compatible
   - 900px: Modern clients with larger displays
4. Set default padding/spacing preferences
5. Test across devices/client before finalising

---

## Tips & Best Practices

### Design Best Practices

**Content Organisation:**
- Start with Email Layout (global settings)
- Add container blocks for visual sections
- Use dividers to separate major sections
- Add spacers for breathing room
- Keep email scannable with clear hierarchy

**Typography:**
- Use 1-2 font families maximum
- Heading hierarchy: H1 > H2 > H3
- Body text: 14-16px
- Line spacing: 1.5 for readability
- Limit colour variations to 3-5 colours

**Colour Scheme:**
- High contrast for text vs. background
- Accent colours for buttons
- Consistent branding colours
- Consider colourblind accessibility
- Test on various email clients

**Images:**
- Always include alt text
- Optimise file size before upload
- Specify dimensions for consistency
- Use high-quality images (retina-ready)
- Test image display in preview

**Mobile Responsiveness:**
- Test in mobile view frequently
- Keep important content above fold
- Ensure buttons are tap-friendly (44px+)
- Single column layout for mobile
- Verify text readability at small size

### Editor Workflow

**Efficient editing:**
1. Structure first (Email Layout > Containers > Blocks)
2. Content second (add text, images, links)
3. Styling last (colours, fonts, spacing)
4. Preview often (use Preview tab)
5. Test mobile view (use Mobile toggle)
6. Export when complete

**Organising blocks:**
- Use containers to group related content
- Logical visual hierarchy
- Consistent spacing (use spacers)
- Alignment: left/centre/right per section

**Common mistakes to avoid:**
-  Too many fonts (limit to 1-2)
-  Poor colour contrast (hard to read)
-  Images without alt text (accessibility issue)
-  Buttons without clear context
-  Skipping mobile preview
-  Not exporting before closing browser

### Preview & Testing

**Before finalising:**
1. Switch to **Preview tab** - Review final appearance
2. Toggle **Mobile view** - Check mobile layout
3. Check **HTML tab** - Verify code generation
4. Review **JSON tab** - Confirm structure

**Common issues and fixes:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Text hard to read | Low contrast | Adjust text/background colours |
| Button not visible | Same colour as background | Change button colours |
| Image appears stretched | Incorrect dimensions | Set proper width/height |
| Layout broken on mobile | Too wide/complex layout | Use single column for mobile |
| Colours look different | Client rendering variation | Use web-safe colours |

### Export & Integration

**Before exporting:**
1. Save a backup (export JSON)
2. Final preview check
3. Mobile view verification

**After export:**
- HTML can be used in email templates
- JSON for system integration
- Keep original file for edits
- Version your templates

---

## Common Questions

**Q: Can I undo changes?**
A: The application doesn't have undo/redo. Export JSON frequently for backup. To revert, import your last saved JSON file.

**Q: Will my email work in all clients?**
A: Email Builder uses web-safe fonts and standard HTML for maximum compatibility. Test in your target clients before sending. Some features may have limited support in older clients, such as older versions of Outlook.

**Q: Can I edit HTML directly?**
A: Yes, there's an HTML Block for custom code. You can also view/copy HTML from the HTML tab.

**Q: How do I ensure accessibility?**
A: Always add alt text to images. Use proper heading hierarchy. Ensure colour contrast. Use semantic HTML blocks (Heading vs. Text).

**Q: Is there a size limit for images?**
A: Recommended max 300px width. Keep file sizes small for faster email delivery.

**Q: Can I collaborate with team members?**
A: Export your design as JSON. Share the file with colleagues. They can import and continue editing.

**Q: What if I want to start over?**
A: Refresh the browser page. The editor resets to default configuration. 

---

## Support & Resources

**Need help?**
- Review this guide for feature explanations
- Check the Inspector Drawer tooltips
- Consult the block type sections above
- Test your design in preview and mobile views

**Best places to check:**
- Inspector Drawer - Shows options for selected block
- Tooltips - Hover over buttons for hints
- Preview tab - Visual verification
- Mobile toggle - Responsive testing

---

## Summary

The Email Builder provides a complete, visual interface for creating professional emails. By understanding the block types, using the Inspector Drawer effectively, and following design best practices, you can create emails that look great across all devices and email clients.

**Quick Start:**
1. Select blocks from the canvas
2. Configure in the Inspector Drawer
3. Preview frequently
4. Export as JSON when complete