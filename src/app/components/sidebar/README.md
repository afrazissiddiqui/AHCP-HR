# Sidebar Component - Reusable Documentation

## Overview
The `SidebarComponent` is a standalone, reusable Angular component that provides a collapsible sidebar with navigation items. It can be used on any page in your application.

## File Structure
```
src/app/components/sidebar/
├── sidebar.ts       (Component logic)
├── sidebar.html     (Template)
├── sidebar.css      (Styles)
└── README.md        (This file)
```

## How to Use It

### 1. Import the Component
In any component where you want to use the sidebar, import the `SidebarComponent`:

```typescript
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent], // Add SidebarComponent
  templateUrl: './my-page.html',
  styleUrl: './my-page.css'
})
export class MyPageComponent {
  // Your component logic
}
```

### 2. Add to Your Template
Use the sidebar in your HTML template:

```html
<div style="display: flex;">
  <!-- Sidebar -->
  <app-sidebar 
    [title]="'My Navigation'"
    (folderSelected)="onFolderSelected($event)"
    (manageFoldersClick)="onManageFolders()">
  </app-sidebar>

  <!-- Your Page Content -->
  <div style="flex: 1; padding: 20px;">
    <!-- Your content here -->
  </div>
</div>
```

### 3. Handle Events
In your component TypeScript file, add event handlers:

```typescript
export class MyPageComponent {
  
  onFolderSelected(folder: string): void {
    console.log('Folder selected:', folder);
    // Handle folder selection
  }

  onManageFolders(): void {
    console.log('Manage folders clicked');
    // Handle manage folders action
  }
}
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `'My Forms'` | Title displayed at the top of the sidebar |
| `sections` | `SidebarSection[]` | `[]` | Sidebar sections with items (optional for default layout) |

## Output Events

| Event | Type | Description |
|-------|------|-------------|
| `folderSelected` | `EventEmitter<string>` | Emitted when a navigation item is clicked |
| `manageFoldersClick` | `EventEmitter<void>` | Emitted when the "Manage Folders" button is clicked |

## Example: Complete Usage in a Component

**my-page.ts:**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div style="display: flex;">
      <app-sidebar 
        [title]="'Dashboard'"
        (folderSelected)="handleFolderSelect($event)"
        (manageFoldersClick)="handleManageFolders()">
      </app-sidebar>

      <div style="flex: 1; padding: 20px;">
        <h1>Page Content</h1>
        <p>Current selection: {{ selectedFolder }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      height: 100vh;
    }
  `]
})
export class MyPageComponent {
  selectedFolder = '';

  handleFolderSelect(folder: string): void {
    this.selectedFolder = folder;
    console.log('Selected:', folder);
  }

  handleManageFolders(): void {
    console.log('Manage folders action triggered');
  }
}
```

## Customization

### Change the Title
```html
<app-sidebar [title]="'My Custom Title'"></app-sidebar>
```

### Add Layout Wrapper (Optional)
For consistent styling across pages, create a layout component:

**shared-layout.ts:**
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar';

@Component({
  selector: 'app-shared-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  template: `
    <div style="display: flex; height: 100vh;">
      <app-sidebar [title]="'My Forms'"></app-sidebar>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class SharedLayoutComponent {}
```

## Styling

All styles are scoped to the `SidebarComponent`. If you need to customize:

1. **Override styles in your component's CSS:**
```css
::ng-deep .side-nav {
  width: 300px; /* Change width */
}

::ng-deep .nav-item.active {
  background-color: #your-color; /* Change active state color */
}
```

2. **Or modify `sidebar.css` directly** if you want global changes.

## Default Navigation Structure

The sidebar comes with a default structure:
- **All Forms** (top-level item)
- **In Progress** (collapsible section)
  - Inbox
  - Recruitment
- **Completed** (collapsible section)
  - Unfiled
  - Demo
  - Test
  - waki_test
- **Manage Folders** (footer button)

## Browser Compatibility
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓ (responsive design)

## Notes
- The sidebar is fully responsive with signals for state management
- Uses Angular's OnPush change detection for performance
- Built as a standalone component (no NgModule required)