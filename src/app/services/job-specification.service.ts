import { Injectable, signal } from '@angular/core';

export interface JobSpecificationRecord {
  Id: number;
  jobTitle: string;
  department: string;
  vacancy: number;
  employmentCategory: string;
  employmentNature: string;
  employmentType: string;
  gradeWorkLevel: string;
  jobDescription: string;
  experienceRequirement: string;
  selected?: boolean;
  keyResponsibilities?: string;
  basicSalary?: string;
  medicalAllowance?: string;
  fuelAllowance?: string;
  packagePerks?: string;
  qualifications?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class JobSpecificationService {
  private readonly jobSpecsList = signal<JobSpecificationRecord[]>([
    { Id: 101, jobTitle: 'Software Engineer', department: 'Engineering', vacancy: 1, employmentCategory: 'Executive', employmentNature: 'Technical', employmentType: 'Permanent', gradeWorkLevel: 'Grade 3', jobDescription: 'Dev role', experienceRequirement: '3 years', selected: false },
    { Id: 102, jobTitle: 'Product Manager', department: 'Product', vacancy: 1, employmentCategory: 'Non-Executive', employmentNature: 'Non-Technical', employmentType: 'Permanent', gradeWorkLevel: 'Grade 4', jobDescription: 'PM role', experienceRequirement: '5 years', selected: false },
    { Id: 103, jobTitle: 'Marketing Specialist', department: 'Marketing', vacancy: 1, employmentCategory: 'Daily Wagers', employmentNature: 'Technical', employmentType: 'Temporary', gradeWorkLevel: 'Grade 2', jobDescription: 'Marketing role', experienceRequirement: '2 years', selected: false },
    { Id: 104, jobTitle: 'HR Specialist', department: 'Human Resources', vacancy: 1, employmentCategory: 'Non-Executive', employmentNature: 'Technical', employmentType: 'Permanent', gradeWorkLevel: 'Grade 3', jobDescription: 'HR role', experienceRequirement: '4 years', selected: false },
    { Id: 105, jobTitle: 'Financial Analyst', department: 'Finance', vacancy: 1, employmentCategory: 'Executive', employmentNature: 'Non-Technical', employmentType: 'Permanent', gradeWorkLevel: 'Grade 4', jobDescription: 'Finance role', experienceRequirement: '3 years', selected: false },
  ]);

  readonly jobSpecs = this.jobSpecsList.asReadonly();

  addJobSpec(spec: Omit<JobSpecificationRecord, 'Id'>): void {
    const nextId = Math.max(...this.jobSpecsList().map(s => s.Id), 100) + 1;
    const newSpec = { ...spec, Id: nextId, selected: false };
    this.jobSpecsList.update(list => [...list, newSpec]);
  }
}
