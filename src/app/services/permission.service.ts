import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  can(_module: string, _action: string): boolean {
    return true;
  }

  canSubmitForm(_module: string, viewMode: boolean, _editMode: boolean): boolean {
    return !viewMode;
  }
}
