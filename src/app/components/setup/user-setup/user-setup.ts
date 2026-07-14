import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { UserListItem, UserSetupPayload, UserSetupService } from '../../../services/user-setup.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import {
  AUTHORIZATION_MODULE_DEFINITIONS,
  buildAuthorizationTemplate,
  isPermissionGranted,
  permissionKey,
  updateAllPermissionsInDraft,
  updateModulePermissionsInDraft,
  updatePermissionInDraft,
  UserAuthorizationModule,
} from '../../../utils/user-authorization.util';
import { displayDateOnly } from '../../../utils/date-format.util';

type UserFormMode = 'add' | 'edit';

@Component({
  selector: 'app-user-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-setup.html',
  styleUrl: './user-setup.css',
})
export class UserSetupComponent implements OnInit {
  private readonly userSetupService = inject(UserSetupService);
  private readonly alertService = inject(AlertService);
  private readonly editableFallbackColumns = ['name', 'email', 'password'];

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly users = signal<UserListItem[]>([]);
  readonly columns = signal<string[]>([]);
  readonly formMode = signal<UserFormMode>('add');
  readonly editingUserId = signal<string | number | null>(null);
  readonly formFields = signal<string[]>([]);
  readonly formModel = signal<Record<string, string>>({});
  readonly authorization = signal<UserAuthorizationModule[]>(buildAuthorizationTemplate());
  readonly authDefinitions = AUTHORIZATION_MODULE_DEFINITIONS;
  readonly nameSuggestions = computed(() => this.buildFieldSuggestions(['name', 'Name'], this.fieldValue('name') || this.fieldValue('Name')));
  readonly emailSuggestions = computed(() => this.buildFieldSuggestions(['email', 'Email'], this.fieldValue('email') || this.fieldValue('Email')));
  readonly authorizationSummary = computed(() => {
    const authorization = this.authorization();
    let total = 0;
    let granted = 0;

    for (const module of authorization) {
      for (const value of Object.values(module)) {
        total += 1;
        if (value === 1) {
          granted += 1;
        }
      }
    }

    return { total, granted };
  });
  readonly authorizationProgress = computed(() => {
    const summary = this.authorizationSummary();
    return summary.total ? `${Math.round((summary.granted / summary.total) * 100)}%` : '0%';
  });
  readonly totalUsers = computed(() => this.users().length);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userSetupService
      .fetchUsers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.columns.set(this.deriveColumns(users));
          this.formFields.set(this.deriveEditableFields(users));
          this.resetForm();
        },
        error: (error: unknown) => {
          this.users.set([]);
          this.columns.set([]);
          this.formFields.set(this.deriveEditableFields([]));
          this.resetForm();
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load user list.'),
          );
        },
      });
  }

  columnLabel(column: string): string {
    return column
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  isPermissionAllowed(moduleSlug: string, action: string): boolean {
    return isPermissionGranted(this.authorization(), moduleSlug, action);
  }

  togglePermission(moduleSlug: string, action: string, allowed: boolean): void {
    const key = permissionKey(moduleSlug, action);
    this.authorization.set(updatePermissionInDraft(this.authorization(), key, allowed ? 1 : 0));
  }

  setModulePermissions(moduleSlug: string, allowed: boolean): void {
    this.authorization.set(updateModulePermissionsInDraft(this.authorization(), moduleSlug, allowed));
  }

  setAllPermissions(allowed: boolean): void {
    this.authorization.set(updateAllPermissionsInDraft(this.authorization(), allowed));
  }

  cellValue(user: UserListItem, column: string): string {
    const value = user[column];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (this.isDateColumn(column)) {
      return this.formatDateColumn(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private isDateColumn(column: string): boolean {
    const normalized = column.toLowerCase();
    return normalized.endsWith('_at') || normalized === 'createdat' || normalized === 'updatedat';
  }

  private formatDateColumn(value: unknown): string {
    const formatted = displayDateOnly(value as string | number);
    if (formatted === '—') {
      return '—';
    }
    return formatted.replace(/-/g, '/');
  }

  trackByColumn(_index: number, column: string): string {
    return column;
  }

  fieldValue(field: string): string {
    return this.formModel()[field] ?? '';
  }

  updateField(field: string, value: string): void {
    this.formModel.update((model) => ({
      ...model,
      [field]: value,
    }));
  }

  formTitle(): string {
    return this.formMode() === 'edit' ? 'Update User' : 'Add User';
  }

  submitUser(): void {
    if (this.saving()) {
      return;
    }

    const payload = this.buildSubmitPayload();
    const requiredField = this.firstMissingRequiredField(payload);
    if (requiredField) {
      this.alertService.validation(`${this.columnLabel(requiredField)} is required.`);
      return;
    }

    this.saving.set(true);
    const request =
      this.formMode() === 'edit' && this.editingUserId() !== null
        ? this.userSetupService.updateUser(this.editingUserId() as string | number, payload)
        : this.userSetupService.addUser(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.alertService.success(
          'Saved',
          this.formMode() === 'edit' ? 'User updated successfully.' : 'User added successfully.',
        );
        this.loadUsers();
      },
      error: (error: unknown) => {
        void this.alertService.error(
          'Save Failed',
          formatApiErrorMessage(error, `Failed to ${this.formMode() === 'edit' ? 'update' : 'add'} user.`),
        );
      },
    });
  }

  startEdit(user: UserListItem): void {
    const userId = this.resolveUserId(user);
    if (userId === null) {
      this.alertService.warning('Edit', 'Unable to edit this row: missing user id.');
      return;
    }

    const nextModel: Record<string, string> = {};
    for (const field of this.formFields()) {
      nextModel[field] = this.valueToInput(user[field]);
    }

    this.formMode.set('edit');
    this.editingUserId.set(userId);
    this.formModel.set(nextModel);
    this.authorization.set(buildAuthorizationTemplate(user['authorization'] ?? user['Authorization'] ?? []));
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async deleteUser(user: UserListItem): Promise<void> {
    if (this.deleting() || this.saving()) {
      return;
    }

    const userId = this.resolveUserId(user);
    if (userId === null) {
      this.alertService.warning('Delete', 'Unable to delete this row: missing user id.');
      return;
    }

    const label =
      this.valueToInput(user['name']) || this.valueToInput(user['Name']) || this.valueToInput(user['email']) || `ID ${userId}`;
    const result = await this.alertService.confirm('Delete user?', `Remove ${label} from the list?`);
    if (!result.isConfirmed) {
      return;
    }

    this.deleting.set(true);
    this.userSetupService
      .deleteUser(userId)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.alertService.success('Deleted', 'User removed successfully.');
          if (this.editingUserId() === userId) {
            this.resetForm();
          }
          this.loadUsers();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Delete Failed',
            formatApiErrorMessage(error, 'Failed to delete user.'),
          );
        },
      });
  }

  private deriveColumns(users: UserListItem[]): string[] {
    const priority = [
      'id',
      'Id',
      'ID',
      'name',
      'Name',
      'username',
      'Username',
      'email',
      'Email',
      'is_admin',
      'isAdmin',
      'role',
      'Role',
      'created_at',
      'createdAt',
    ];
    const discovered = new Set<string>();

    for (const user of users) {
      Object.keys(user).forEach((key) => discovered.add(key));
    }

    const discoveredFiltered = [...discovered].filter((key) => key.toLowerCase() !== 'authorization');
    const ordered = priority.filter((key) => discoveredFiltered.includes(key));
    const remaining = discoveredFiltered.filter((key) => !priority.includes(key)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }

  private deriveEditableFields(users: UserListItem[]): string[] {
    const discovered = new Set<string>();
    for (const user of users) {
      Object.keys(user).forEach((key) => {
        if (!this.isReadOnlyField(key)) {
          discovered.add(key);
        }
      });
    }

    for (const key of this.editableFallbackColumns) {
      discovered.add(key);
    }

    const priority = ['name', 'Name', 'username', 'Username', 'email', 'Email', 'password'];
    const ordered = priority.filter((key) => discovered.has(key));
    const remaining = [...discovered].filter((key) => !priority.includes(key)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }

  private isReadOnlyField(field: string): boolean {
    const normalized = field.toLowerCase();
    return [
      'id',
      'created_at',
      'updated_at',
      'deleted_at',
      'email_verified_at',
      'authorization',
      'is_admin',
      'isadmin',
    ].includes(normalized);
  }

  private buildFieldSuggestions(fields: string[], query: string): string[] {
    const value = query.trim().toLowerCase();
    if (!value) {
      return [];
    }

    const results = new Set<string>();
    for (const user of this.users()) {
      for (const field of fields) {
        const raw = user[field];
        if (typeof raw !== 'string') {
          continue;
        }
        const text = raw.trim();
        if (!text) {
          continue;
        }
        if (text.toLowerCase().includes(value)) {
          results.add(text);
        }
      }
    }

    return [...results].sort((a, b) => a.localeCompare(b));
  }

  private resetForm(): void {
    const nextModel: Record<string, string> = {};
    for (const field of this.formFields()) {
      nextModel[field] = '';
    }
    this.formMode.set('add');
    this.editingUserId.set(null);
    this.formModel.set(nextModel);
    this.authorization.set(buildAuthorizationTemplate());
  }

  private buildSubmitPayload(): UserSetupPayload {
    const model = this.formModel();
    const read = (...keys: string[]): string => {
      for (const key of keys) {
        const value = (model[key] ?? '').trim();
        if (value) {
          return value;
        }
      }
      return '';
    };

    const payload: UserSetupPayload = {
      name: read('name', 'Name'),
      email: read('email', 'Email'),
      authorization: this.authorization(),
    };

    const password = read('password');
    if (password || this.formMode() === 'add') {
      payload.password = password;
    }

    return payload;
  }

  private firstMissingRequiredField(payload: UserSetupPayload): string | null {
    if (!payload.name.trim()) {
      return 'name';
    }
    if (!payload.email.trim()) {
      return 'email';
    }
    if (this.formMode() === 'add' && !payload.password?.trim()) {
      return 'password';
    }
    return null;
  }

  private resolveUserId(user: UserListItem): string | number | null {
    const keys = ['id', 'Id', 'ID'];
    for (const key of keys) {
      const value = user[key];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return typeof value === 'number' ? value : String(value).trim();
      }
    }
    return null;
  }

  private valueToInput(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    return String(value);
  }
}
