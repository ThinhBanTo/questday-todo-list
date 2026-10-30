# Quest Log - Retro Style Guide
This style guide outlines the visual design principles for the "Quest Log" application, which combines a retro notebook aesthetic with gamified elements.
## 🎨 Color Palette
### Paper Colors
These colors form the base of our notebook aesthetic:
- **Background** `#f8f5e6`: The main page background, mimicking aged paper
- **Notebook** `#f9f6ea`: Slightly lighter shade for the notebook surface
- **Note** `#fffbe6`: Brightest shade for individual notes or input areas
### Ink Colors
Text colors that mimic handwritten ink:
- **Primary** `#4a3e2a`: Used for headers and important text
- **Secondary** `#3a3027`: Used for body text
- **Tertiary** `#8a7b6a`: Used for placeholder text and less important information
- **Muted** `#7d5a44`: Used for labels and secondary information
### Notebook Elements
Colors that represent physical notebook elements:
- **Binding** `#d4c5a8`: The spiral binding color
- **Binding Border** `#b5a88a`: Border color for binding elements
- **Divider** `#e5dcc5`: Used for horizontal rules and dividers
- **Underline** `#c9bda1`: Used for input underlines
### Interactive Colors
Colors for buttons and interactive elements:
- **Primary** `#9c6644`: Default state for interactive elements
- **Primary Hover** `#7d4e32`: Hover state for interactive elements
### Functional Colors
Colors that convey meaning:
- **Danger** `#9e2b25`: Used for delete actions and due dates
- **Danger Hover** `#7d1f1c`: Hover state for danger actions
- **Success** `#4a7c59`: Used for confirmation actions
- **Success Hover** `#3a6347`: Hover state for success actions
### Progress & Rewards
Colors for gamification elements:
- **Track** `#efe9d9`: Progress bar background
- **Bar** `#a4c3a2`: Progress bar fill color
- **Star** `#d4b556`: Achievement star fill color
- **Star Border** `#b5a88a`: Achievement star border
- **Completion** `#f3eed7`: Background flash when completing a task
## 🖋️ Typography
### Font Families
- **Headers** (`"Courier Prime", monospace`): Used for all headings, labels, and UI elements that should appear typed or stamped
- **Body** (`"Indie Flower", cursive`): Used for task text, notes, and any content that should appear handwritten
### Font Weights
- **Regular** (400): Default weight for most text
- **Bold** (700): Used for headers and emphasis
### Font Sizes
- **xs** (0.8rem): Very small text like due dates
- **sm** (0.9rem): Small text like labels
- **base** (1rem): Default text size
- **md** (1.1rem): Slightly larger text for task items
- **lg** (1.25rem): Subheadings
- **xl** (1.5rem): Minor headings
- **2xl** (1.875rem): Section headings
- **3xl** (2.25rem): Page title
- **4xl** (3rem): Large display text
### Letter Spacing
- **Header** (3px): Wide spacing for main headers
- **Subtitle** (1px): Slight spacing for section headers
## 📏 Spacing
Follow a consistent spacing scale for margins, padding, and gaps:
- **Tiny** (0.25rem): Minimal spacing between closely related items
- **Small** (0.5rem): Default spacing between related items
- **Medium** (1rem): Standard spacing between components
- **Large** (1.5rem): Spacing between major sections
- **Extra Large** (2rem+): Major separations or top/bottom page margins
## 🖼️ Textures & Effects
### Background Textures
- **Paper**: Light texture for the main background
- **Old Paper**: Subtle texture for the notebook surface
- **Notebook**: Linear texture for note areas
- **Notebook Dark**: Texture for the progress bar
### Transformations
Apply subtle rotations to create a hand-placed feel:
- Rotate elements between -1° and 2° to avoid perfect alignment
- Alternate between positive and negative rotations for adjacent elements
### Shadows & Depth
- Use soft shadows with warm tones to mimic paper depth
- Apply text shadows to headers to create a stamped or pressed appearance
- For paper elements, use a combination of shadows and subtle border effects
## 🎮 Gamification Elements
### Progress Bar
The progress bar should appear hand-drawn with dashed borders and tick marks:
- Track: Light paper texture with dashed border
- Fill: Green progress with notebook texture
- Include visible tick marks at 20% intervals
### Achievements
- Use star icons with a golden fill for completed tasks
- Apply a brief "flash" effect when completing a task
- Add subtle animations to reward user interactions
### Terminology
Use RPG-inspired terminology:
- Tasks → Quests
- Todo List → Quest Log or Active Quests
- Completion → Achievement
## 📝 Component Styling Guidelines
### Notebook Page
- Apply paper textures to all surfaces
- Include a spiral binding effect on the left side
- Use subtle line patterns to mimic notebook lines
### Headers
- Use the Courier Prime font with uppercase transformation
- Apply a slight rotation and text shadow for a "stamped" appearance
- Include decorative underlines or dividers
### Input Fields
- Style inputs to blend with the paper background
- Use bottom borders only to mimic writing lines
- Apply the handwriting font to user input
### Buttons
- Minimize traditional button styling in favor of icon-based actions
- Use hover effects that mimic ink darkening
- For primary actions, consider stamp-like or seal-like styling
### Lists
- Include subtle line backgrounds to mimic notebook ruling
- Apply slight rotations to list items for an organic feel
- Use hand-drawn checkboxes rather than standard form controls