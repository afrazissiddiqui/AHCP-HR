import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobSpecificationService } from '../../../../services/job-specification.service';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-create-job-specification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-job-specification.html',
  styleUrl: './create-job-specification.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateJobSpecificationComponent {
  // Form Fields - General
  jobTitle = '';
  department = '';
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
    private jobSpecService: JobSpecificationService,
    private alertService: AlertService
  ) { }

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

    this.jobSpecService.addJobSpec({
      jobTitle: this.jobTitle,
      department: this.department,
      vacancy: this.vacancyCount || 0,
      jobDescription: this.jobDescription,
      experienceRequirement: this.experienceRequirement,
      employmentCategory: this.employmentCategory,
      employmentNature: this.employmentNature,
      employmentType: this.employmentType,
      gradeWorkLevel: this.gradeWorkLevel,
      keyResponsibilities: this.keyResponsibilities,
      basicSalary: this.basicSalary,
      medicalAllowance: this.medicalAllowance,
      fuelAllowance: this.fuelAllowance,
      packagePerks: this.packagePerks,
      qualifications: this.qualifications.filter(q => q.trim() !== ''),
    });

    console.log('Job Specification Added');

    this.alertService.success('Success', 'Job Specification saved successfully!');
    this.back();
  }
}
