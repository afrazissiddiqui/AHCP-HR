import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';


// Core components
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/TabContainer.js";
import "@ui5/webcomponents/dist/Tab.js";

// Fiori components (ShellBar is here!)
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-fiori/dist/ShellBarItem.js";

// Icons used by <ui5-icon> (tree-shaken; do not import AllIcons)
import './app/ui5-icons';



import "@ui5/webcomponents/dist/DatePicker.js";


bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
