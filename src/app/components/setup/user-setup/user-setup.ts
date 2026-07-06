import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AlertService } from '../../../services/alert.service';
import {
  UserListItem,
  UserSetupPayload,
  UserSetupService,
} from '../../../services/user-setup.service';
import { formatApiErrorMessage } from '../../../utils/api-error.util';
import { displayDateOnly } from '../../../utils/date-format.util';
import {
  CrudBucket,
  UserAuthorizationModule,
  UserAuthorizationModuleRow,
  UserAuthorizationSummary,
  authorizationToApiPayload,
  buildAuthorizationTemplate,
  cloneAuthorization,
  crudBucketEntries,
  crudBucketLabel,
  moduleAllEntries,
  parseUserAuthorization,
  updateAllPermissionsInDraft,
  updateModulePermissionsInDraft,
  updatePermissionInDraft,
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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('authDialogOverlay') private authDialogOverlay?: ElementRef<HTMLElement>;
  @ViewChild('userFormPanel') private userFormPanel?: ElementRef<HTMLElement>;

  private readonly tableColumns: UserTableColumn[] = [
    { key: 'name', label: 'Name', aliases: ['name', 'Name'] },
    { key: 'email', label: 'Email', aliases: ['email', 'Email'] },
    { key: 'created_at', label: 'Created', aliases: ['created_at', 'createdAt', 'Created At'] },
    { key: 'authorization', label: 'Authorization', aliases: ['authorization', 'Authorization'] },
  ];

  readonly loading = signal(false);
  readonly loadingDetail = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly users = signal<UserListItem[]>([]);
  readonly formMode = signal<UserFormMode>('add');
  readonly editingUserId = signal<string | number | null>(null);
  readonly formName = signal('');
  readonly formEmail = signal('');
  readonly formPassword = signal('');
  readonly authorizationTemplate = signal<UserAuthorizationModule[]>(buildAuthorizationTemplate());
  readonly authorizationDraft = signal<UserAuthorizationModule[]>(cloneAuthorization(buildAuthorizationTemplate()));
  readonly searchText = signal('');
  readonly authorizationDialogOpen = signal(false);
  readonly authorizationDialogUser = signal<UserListItem | null>(null);
  readonly authorizationDialogSummary = signal<UserAuthorizationSummary | null>(null);
  readonly authorizationModuleFilter = signal('');
  readonly formModuleFilter = signal('');
  readonly expandedFormModules = signal<Record<string, boolean>>({});
  readonly expandedDialogModules = signal<Record<string, boolean>>({});

  readonly crudBuckets: CrudBucket[] = ['create', 'read', 'update', 'delete', 'other'];

  readonly formAuthorizationSummary = computed(
    () => parseUserAuthorization(this.authorizationDraft()) ?? parseUserAuthorization(this.authorizationTemplate()),
  );

  readonly filteredFormModules = computed(() => {
    const summary = this.formAuthorizationSummary();
    if (!summary) {
      return [];
    }

    const query = this.formModuleFilter().trim().toLowerCase();
    if (!query) {
      return summary.modules;
    }

    return summary.modules.filter((module) => module.moduleName.toLowerCase().includes(query));
  });

  readonly formGrantedCount = computed(() => this.formAuthorizationSummary()?.granted ?? 0);
  readonly formTotalCount = computed(() => this.formAuthorizationSummary()?.total ?? 0);

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
    this.resetForm();
    this.loadUsers();

    this.destroyRef.onDestroy(() => {
      this.document.body.style.overflow = '';
      this.authDialogOverlay?.nativeElement?.remove();
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userSetupService
      .fetchUsers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.refreshAuthorizationTemplate(users);
          if (this.formMode() === 'add') {
            this.authorizationDraft.set(cloneAuthorization(this.authorizationTemplate()));
          }
        },
        error: (error: unknown) => {
          this.users.set([]);
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
    this.expandedDialogModules.set({});
    this.authorizationDialogOpen.set(true);
    afterNextRender(() => this.attachAuthorizationOverlay());
  }

  editPermissionsFromDialog(): void {
    const user = this.authorizationDialogUser();
    this.closeAuthorizationDialog();
    if (user) {
      this.startEdit(user);
    }
  }

  closeAuthorizationDialog(): void {
    this.authorizationDialogOpen.set(false);
    this.authorizationDialogUser.set(null);
    this.authorizationDialogSummary.set(null);
    this.authorizationModuleFilter.set('');
    this.document.body.style.overflow = '';
  }

  private attachAuthorizationOverlay(): void {
    const overlay = this.authDialogOverlay?.nativeElement;
    if (!overlay || overlay.parentElement === this.document.body) {
      return;
    }

    this.document.body.appendChild(overlay);
    this.document.body.style.overflow = 'hidden';
  }

  authorizationDialogEmail(): string {
    const user = this.authorizationDialogUser();
    return user ? this.resolveField(user, ['email', 'Email']) : '';
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

  permissionStatusLabel(value: number): string {
    return Number(value) === 1 ? 'Allowed' : 'Denied';
  }

  permissionValueLabel(value: number): string {
    return this.permissionStatusLabel(value);
  }

  authorizationDialogTitle(): string {
    const user = this.authorizationDialogUser();
    if (!user) {
      return 'Authorization overview';
    }

    return (
      this.resolveField(user, ['name', 'Name']) ||
      this.resolveField(user, ['email', 'Email']) ||
      'Authorization overview'
    );
  }

  formTitle(): string {
    return this.formMode() === 'edit' ? 'Update user & permissions' : 'Add new user';
  }

  formSubtitle(): string {
    return this.formMode() === 'edit'
      ? 'Change account details and toggle which form actions this user may perform.'
      : 'Create an account and choose allowed CRUD actions for each form module.';
  }

  startAddUser(): void {
    this.resetForm();
    this.scrollToFormPanel();
  }

  isUserRowActive(user: UserListItem): boolean {
    const userId = this.resolveUserId(user);
    return userId !== null && this.formMode() === 'edit' && this.editingUserId() === userId;
  }

  setFormPermission(key: string, allowed: boolean): void {
    this.authorizationDraft.update((draft) => updatePermissionInDraft(draft, key, allowed ? 1 : 0));
  }

  setModulePermissions(moduleSlug: string, allowed: boolean): void {
    this.authorizationDraft.update((draft) => updateModulePermissionsInDraft(draft, moduleSlug, allowed));
  }

  grantAllFormPermissions(): void {
    this.authorizationDraft.update((draft) => updateAllPermissionsInDraft(draft, true));
  }

  denyAllFormPermissions(): void {
    this.authorizationDraft.update((draft) => updateAllPermissionsInDraft(draft, false));
  }

  moduleEntries(module: UserAuthorizationModuleRow) {
    return moduleAllEntries(module);
  }

  formProgressPercent(): number {
    const total = this.formTotalCount();
    if (!total) {
      return 0;
    }
    return Math.round((this.formGrantedCount() / total) * 100);
  }

  moduleInitials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  isFormModuleExpanded(moduleSlug: string): boolean {
    return this.expandedFormModules()[moduleSlug] === true;
  }

  isDialogModuleExpanded(moduleSlug: string): boolean {
    return this.expandedDialogModules()[moduleSlug] === true;
  }

  toggleFormModuleExpanded(moduleSlug: string): void {
    this.expandedFormModules.update((state) => ({
      ...state,
      [moduleSlug]: !state[moduleSlug],
    }));
  }

  toggleDialogModuleExpanded(moduleSlug: string): void {
    this.expandedDialogModules.update((state) => ({
      ...state,
      [moduleSlug]: !state[moduleSlug],
    }));
  }

  expandAllFormModules(): void {
    const expanded: Record<string, boolean> = {};
    for (const module of this.filteredFormModules()) {
      expanded[module.moduleSlug] = true;
    }
    this.expandedFormModules.set(expanded);
  }

  collapseAllFormModules(): void {
    this.expandedFormModules.set({});
  }

  expandAllDialogModules(): void {
    const expanded: Record<string, boolean> = {};
    for (const module of this.filteredAuthorizationModules()) {
      expanded[module.moduleSlug] = true;
    }
    this.expandedDialogModules.set(expanded);
  }

  collapseAllDialogModules(): void {
    this.expandedDialogModules.set({});
  }

  private scrollToFormPanel(): void {
    afterNextRender(() => {
      this.userFormPanel?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  submitUser(): void {
    if (this.saving()) {
      return;
    }

    const validationMessage = this.validateBeforeSubmit();
    if (validationMessage) {
      this.alertService.validation(validationMessage);
      return;
    }

    const payload = this.buildSubmitPayload();
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
        this.resetForm();
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

    this.loadingDetail.set(true);
    this.userSetupService
      .fetchUserDetail(userId)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (detail) => {
          this.formMode.set('edit');
          this.editingUserId.set(userId);
          this.formName.set(this.resolveField(detail, ['name', 'Name']));
          this.formEmail.set(this.resolveField(detail, ['email', 'Email']));
          this.formPassword.set('');

          const authorization = detail['authorization'] ?? detail['Authorization'];
          const template = buildAuthorizationTemplate(
            ...this.users().map((item) => item['authorization'] ?? item['Authorization']),
            authorization,
          );
          const userAuthorization = buildAuthorizationTemplate(authorization);
          this.authorizationTemplate.set(template);
          this.authorizationDraft.set(
            cloneAuthorization(userAuthorization.length ? userAuthorization : template),
          );
          this.scrollToFormPanel();
        },
        error: (error: unknown) => {
          void this.alertService.error(
            'Load Failed',
            formatApiErrorMessage(error, 'Failed to load user details.'),
          );
        },
      });
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

  moduleGrantedCount(module: UserAuthorizationModuleRow): number {
    return module.grantedCount;
  }

  get displayTableColumns(): UserTableColumn[] {
    return this.tableColumns;
  }

  private refreshAuthorizationTemplate(users: UserListItem[]): void {
    const template = buildAuthorizationTemplate(
      ...users.map((user) => user['authorization'] ?? user['Authorization']),
    );
    this.authorizationTemplate.set(template);
  }

  private resetForm(): void {
    this.formMode.set('add');
    this.editingUserId.set(null);
    this.formName.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formModuleFilter.set('');
    this.expandedFormModules.set({});
    this.authorizationDraft.set(cloneAuthorization(this.authorizationTemplate()));
  }

  private validateBeforeSubmit(): string | null {
    if (!this.formName().trim()) {
      return 'Name is required.';
    }
    if (!this.formEmail().trim()) {
      return 'Email is required.';
    }
    if (this.formMode() === 'add' && !this.formPassword().trim()) {
      return 'Password is required.';
    }
    return null;
  }

  private buildSubmitPayload(): UserSetupPayload {
    const payload: UserSetupPayload = {
      name: this.formName().trim(),
      email: this.formEmail().trim(),
      authorization: authorizationToApiPayload(this.authorizationDraft()),
    };

    const password = this.formPassword().trim();
    if (this.formMode() === 'add') {
      payload.password = password;
    } else if (password) {
      payload.password = password;
    }

    return payload;
  }
}
