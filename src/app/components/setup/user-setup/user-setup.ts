import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import { UserListItem, UserSetupPayload, UserSetupService } from '../../../services/user-setup.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { displayDateOnly } from '../../../utils/date-format.util';
import {
  CrudBucket,
  UserAuthorizationModuleRow,
  UserAuthorizationSummary,
  crudBucketEntries,
  crudBucketLabel,
  parseUserAuthorization,
} from '../../../utils/user-authorization.util';

type UserFormMode = 'add' | 'edit';

interface UserTableColumn {
  key: string;
  label: string;
  aliases: string[];
}

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
  private readonly editableFallbackColumns = ['name', 'email', 'password', 'is_admin'];
  private readonly hiddenFormFields = new Set([
    'authorization',
    'id',
    'created_at',
    'updated_at',
    'deleted_at',
    'email_verified_at',
  ]);

  private readonly tableColumns: UserTableColumn[] = [
    { key: 'name', label: 'Name', aliases: ['name', 'Name'] },
    { key: 'email', label: 'Email', aliases: ['email', 'Email'] },
    { key: 'is_admin', label: 'Role', aliases: ['is_admin', 'isAdmin'] },
    { key: 'created_at', label: 'Created', aliases: ['created_at', 'createdAt', 'Created At'] },
    { key: 'authorization', label: 'Authorization', aliases: ['authorization', 'Authorization'] },
  ];

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly users = signal<UserListItem[]>([]);
  readonly formMode = signal<UserFormMode>('add');
  readonly editingUserId = signal<string | number | null>(null);
  readonly formFields = signal<string[]>([]);
  readonly formModel = signal<Record<string, string>>({});
  readonly searchText = signal('');
  readonly authorizationDialogOpen = signal(false);
  readonly authorizationDialogUser = signal<UserListItem | null>(null);
  readonly authorizationDialogSummary = signal<UserAuthorizationSummary | null>(null);
  readonly authorizationModuleFilter = signal('');

  readonly crudBuckets: CrudBucket[] = ['create', 'read', 'update', 'delete', 'other'];

  readonly filteredAuthorizationModules = computed(() => {
    const summary = this.authorizationDialogSummary();
    if (!summary) {
      return [];
    }

    const query = this.authorizationModuleFilter().trim().toLowerCase();
    if (!query) {
      return summary.modules;
    }

    return summary.modules.filter((module) => module.moduleName.toLowerCase().includes(query));
  });

  readonly totalUsers = computed(() => this.users().length);
  readonly filteredUsers = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    if (!query) {
      return this.users();
    }

    return this.users().filter((user) => {
      const name = this.resolveField(user, ['name', 'Name']).toLowerCase();
      const email = this.resolveField(user, ['email', 'Email']).toLowerCase();
      const id = this.resolveUserId(user);
      return name.includes(query) || email.includes(query) || String(id ?? '').includes(query);
    });
  });

  ngOnInit(): void {
    this.formFields.set(this.deriveEditableFields([]));
    this.resetForm();
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
          this.formFields.set(this.deriveEditableFields(users));
          this.resetForm();
        },
        error: (error: unknown) => {
          this.users.set([]);
          this.formFields.set(this.deriveEditableFields([]));
          this.resetForm();
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load user list.'),
          );
        },
      });
  }

  tableColumnLabel(column: UserTableColumn): string {
    return column.label;
  }

  resolveField(user: UserListItem, aliases: string[]): string {
    for (const alias of aliases) {
      const value = user[alias];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  }

  userInitials(user: UserListItem): string {
    const name = this.resolveField(user, ['name', 'Name']);
    if (!name) {
      return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  isAdminUser(user: UserListItem): boolean {
    const value = this.resolveField(user, ['is_admin', 'isAdmin']);
    return value === '1' || value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
  }

  displayCreatedAt(user: UserListItem): string {
    const value = this.resolveField(user, ['created_at', 'createdAt']);
    if (!value) {
      return '—';
    }
    const formatted = displayDateOnly(value);
    return formatted === '—' ? '—' : formatted.replace(/-/g, '/');
  }

  authorizationSummary(user: UserListItem): UserAuthorizationSummary | null {
    const rawValue = user['authorization'] ?? user['Authorization'];
    return parseUserAuthorization(rawValue);
  }

  openAuthorizationDialog(user: UserListItem): void {
    const summary = this.authorizationSummary(user);
    if (!summary) {
      return;
    }

    this.authorizationDialogUser.set(user);
    this.authorizationDialogSummary.set(summary);
    this.authorizationModuleFilter.set('');
    this.authorizationDialogOpen.set(true);
  }

  closeAuthorizationDialog(): void {
    this.authorizationDialogOpen.set(false);
    this.authorizationDialogUser.set(null);
    this.authorizationDialogSummary.set(null);
    this.authorizationModuleFilter.set('');
  }

  authorizationDialogEmail(): string {
    const user = this.authorizationDialogUser();
    if (!user) {
      return '';
    }
    return this.resolveField(user, ['email', 'Email']);
  }

  authorizationDialogIsAdmin(): boolean {
    const user = this.authorizationDialogUser();
    return user ? this.isAdminUser(user) : false;
  }

  authorizationProgressPercent(summary: UserAuthorizationSummary): number {
    if (!summary.total) {
      return 0;
    }
    return Math.round((summary.granted / summary.total) * 100);
  }

  moduleProgressPercent(module: UserAuthorizationModuleRow): number {
    if (!module.totalCount) {
      return 0;
    }
    return Math.round((module.grantedCount / module.totalCount) * 100);
  }

  crudEntries(module: UserAuthorizationModuleRow, bucket: CrudBucket) {
    return crudBucketEntries(module, bucket);
  }

  crudLabel(bucket: CrudBucket): string {
    return crudBucketLabel(bucket);
  }

  permissionValueLabel(value: number): string {
    return String(value);
  }

  authorizationDialogTitle(): string {
    const user = this.authorizationDialogUser();
    if (!user) {
      return 'Authorization overview';
    }

    const name = this.resolveField(user, ['name', 'Name']);
    const email = this.resolveField(user, ['email', 'Email']);
    return name || email || 'Authorization overview';
  }

  columnLabel(column: string): string {
    return column
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
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
      this.resolveField(user, ['name', 'Name']) ||
      this.resolveField(user, ['email', 'Email']) ||
      `ID ${userId}`;
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

  private deriveEditableFields(users: UserListItem[]): string[] {
    const discovered = new Set<string>();
    for (const user of users) {
      Object.keys(user).forEach((key) => {
        if (!this.isHiddenFormField(key)) {
          discovered.add(key);
        }
      });
    }

    for (const key of this.editableFallbackColumns) {
      discovered.add(key);
    }

    const priority = ['name', 'Name', 'username', 'Username', 'email', 'Email', 'password', 'is_admin', 'isAdmin'];
    const ordered = priority.filter((key) => discovered.has(key));
    const remaining = [...discovered].filter((key) => !priority.includes(key)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }

  private isHiddenFormField(field: string): boolean {
    const normalized = field.toLowerCase();
    return (
      this.hiddenFormFields.has(normalized) ||
      ['id', 'created_at', 'updated_at', 'deleted_at', 'email_verified_at'].includes(normalized)
    );
  }

  private resetForm(): void {
    const nextModel: Record<string, string> = {};
    for (const field of this.formFields()) {
      nextModel[field] = field === 'is_admin' || field === 'isAdmin' ? '0' : '';
    }
    this.formMode.set('add');
    this.editingUserId.set(null);
    this.formModel.set(nextModel);
  }

  private buildSubmitPayload(): UserSetupPayload {
    const payload: UserSetupPayload = {};
    for (const field of this.formFields()) {
      const rawValue = this.formModel()[field] ?? '';
      const trimmed = rawValue.trim();
      if (!trimmed && field === 'password' && this.formMode() === 'edit') {
        continue;
      }
      payload[field] = this.normalizeFieldValue(field, trimmed);
    }
    return payload;
  }

  private normalizeFieldValue(field: string, value: string): unknown {
    if (field === 'is_admin' || field === 'isAdmin') {
      return value === '1' || value.toLowerCase() === 'yes' ? 1 : 0;
    }
    return value;
  }

  private firstMissingRequiredField(payload: UserSetupPayload): string | null {
    const requiredFields = this.formMode() === 'edit' ? ['name', 'email'] : ['name', 'email', 'password'];
    for (const requiredField of requiredFields) {
      const actualField = this.formFields().find((field) => field.toLowerCase() === requiredField);
      if (!actualField) {
        continue;
      }
      const value = payload[actualField];
      if (value === null || value === undefined || String(value).trim() === '') {
        return actualField;
      }
    }
    return null;
  }

  resolveUserId(user: UserListItem): string | number | null {
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

  moduleGrantedCount(module: UserAuthorizationModuleRow): number {
    return module.grantedCount;
  }

  get displayTableColumns(): UserTableColumn[] {
    return this.tableColumns;
  }
}
