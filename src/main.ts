import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';


// Core components
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Icon.js";

// Fiori components (ShellBar is here!)
import "@ui5/webcomponents-fiori/dist/ShellBar.js";

// Icons
import "@ui5/webcomponents-icons/dist/AllIcons.js";



import "@ui5/webcomponents/dist/DatePicker.js";


bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
