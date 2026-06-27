import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  JobSpecificationAddPayload,
  JobSpecificationRecord,
  JobSpecificationService,
} from '../../../../services/job-specification.service';
import { AlertService } from '../../../../services/alert.service';

const DEPARTMENT_OPTIONS = [
  'Production Department',
  'Plant Maintenance Department',
  'Electrical Department',
  'Quality Control Department',
  'Logistics Department',
  'Procurement Department',
  'Admin Department',
  'Accounts & Finance Department',
  'Internal Audit Department',
  'Human Resource (HR) Department',
  'Sales & Marketing Department',
  'IT Department',
  'BOD Department',
  'Common Department',
] as const;

@Component({
  selector: 'app-create-job-specification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-job-specification.html',
  styleUrl: './create-job-specification.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateJobSpecificationComponent implements OnInit {
  protected readonly departmentOptions = DEPARTMENT_OPTIONS;

  editingId: string | null = null;
  pageTitle = 'Create New Job Specification';
  submitButtonLabel = 'Save Job Specification';

  // Form Fields - General
  jobTitle = '';  department = '';
  vacancyCount: number | null = null;
  jobDescription = '';
  experienceRequirement = '';
  employmentCategory = '';
  employmentNature = '';
  employmentType = '';
  gradeWorkLevel = '';
  keyResponsibilities = '';

  // Form Fields - Remuneration
  basicSalary = '';
  medicalAllowance = '';
  fuelAllowance = '';
  packagePerks = '';

  // Form Fields - Qualification (Dynamic)
  qualifications: string[] = [''];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private jobSpecService: JobSpecificationService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }

    this.editingId = editId;
    this.pageTitle = 'Update Job Specification';
    this.submitButtonLabel = 'Update Job Specification';

    const existing = this.jobSpecService.findJobSpecById(editId);
    if (existing) {
      this.populateFromRecord(existing);
      this.cdr.markForCheck();
      return;
    }

    this.jobSpecService.fetchPostedJobSpecifications().subscribe({
      next: (records) => {
        const record = records.find((item) => String(item.Id) === editId);
        if (record) {
          this.populateFromRecord(record);
        } else {
          this.alertService.warning('Edit', 'Job specification not found.');
        }
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load job specification for edit.';
        this.alertService.error('Load Failed', errorMessage);
      },
    });
  }
  addQualification(): void {
    this.qualifications.push('');
  }

  removeQualification(index: number): void {
    if (this.qualifications.length > 1) {
      this.qualifications.splice(index, 1);
    } else {
      this.qualifications[0] = '';
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  back(): void {
    void this.router.navigateByUrl('/job-specification-form');
  }

  submitForm(): void {
    // Validation
    if (!this.jobTitle.trim() || !this.department.trim()) {
      this.alertService.validation('Please enter Job Title and Department at minimum.');
      return;
    }

    const payload: JobSpecificationAddPayload = {
      jobTitle: this.jobTitle.trim(),
      department: this.department.trim(),
      vacancyCount: this.vacancyCount ?? 0,
      jobDescription: this.jobDescription.trim(),
      experienceRequirement: this.experienceRequirement.trim(),
      employmentCategory: this.employmentCategory,
      employmentNature: this.employmentNature,
      employmentType: this.employmentType,
      gradeWorkLevel: this.gradeWorkLevel,
      keyResponsibilities: this.keyResponsibilities.trim(),
      basicSalary: Number.parseFloat(this.basicSalary) || 0,
      medicalAllowance: Number.parseFloat(this.medicalAllowance) || 0,
      fuelAllowance: Number.parseFloat(this.fuelAllowance) || 0,
      packagePerks: this.packagePerks.trim(),
      qualifications: this.qualifications.filter(q => q.trim() !== ''),
    };

    const request$ = this.editingId
      ? this.jobSpecService.updateJobSpec(this.editingId, payload)
      : this.jobSpecService.addJobSpec(payload);

    request$.subscribe({
      next: () => {
        this.alertService.success(
          'Success',
          this.editingId
            ? 'Job specification updated successfully!'
            : 'Job specification saved successfully!',
        );
        this.back();
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          (this.editingId ? 'Failed to update job specification.' : 'Failed to save job specification.');
        this.alertService.error(this.editingId ? 'Update Failed' : 'Save Failed', errorMessage);
      },
    });
  }

  private populateFromRecord(record: JobSpecificationRecord): void {
    this.jobTitle = record.jobTitle === '—' ? '' : record.jobTitle;
    this.department = record.department === '—' ? '' : record.department;
    this.vacancyCount = record.vacancyCount || null;
    this.jobDescription = record.jobDescription === '—' ? '' : record.jobDescription;
    this.experienceRequirement = record.experienceRequirement === '—' ? '' : record.experienceRequirement;
    this.employmentCategory = record.employmentCategory === '—' ? '' : record.employmentCategory;
    this.employmentNature = record.employmentNature === '—' ? '' : record.employmentNature;
    this.employmentType = record.employmentType === '—' ? '' : record.employmentType;
    this.gradeWorkLevel = record.gradeWorkLevel === '—' ? '' : record.gradeWorkLevel;
    this.keyResponsibilities = record.keyResponsibilities === '—' ? '' : record.keyResponsibilities;
    this.basicSalary = record.basicSalary ? String(record.basicSalary) : '';
    this.medicalAllowance = record.medicalAllowance ? String(record.medicalAllowance) : '';
    this.fuelAllowance = record.fuelAllowance ? String(record.fuelAllowance) : '';
    this.packagePerks = record.packagePerks === '—' ? '' : record.packagePerks;
    this.qualifications = record.qualifications.length ? [...record.qualifications] : [''];
  }
}