import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import {
  ApplicationFormDetail,
  ApplicationFormRecord,
  ApplicationFormService,
} from '../../../../services/application-form.service';

@Component({
  selector: 'app-create-job-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-job-requisition.html',
  styleUrl: './create-job-requisition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateJobRequisitionComponent implements OnInit, OnDestroy {
  protected readonly copyExisting = signal(true);
  protected readonly activeSection = signal('personal-info-section');
  // Personal Information (OHEM mappings where applicable)
  protected readonly personName = signal(''); // free text
  protected readonly firstName = signal(''); // OHEM.firstName
  protected readonly middleName = signal(''); // OHEM.middleName
  protected readonly lastName = signal(''); // OHEM.lastName
  protected readonly fatherOrHusbandName = signal(''); // free text
  protected readonly gender = signal<'Male' | 'Female' | ''>('');
  protected readonly maritalStatus = signal<'Single' | 'Married' | ''>('');
  protected readonly dateOfBirth = signal(''); // date (yyyy-mm-dd)
  protected readonly nationality = signal(''); // free text
  protected readonly religion = signal(''); // free text
  protected readonly bloodGroup = signal(''); // free text
  protected readonly nationalIdCardNo = signal(''); // XXXXX-XXXXXXX-X
  protected readonly incomeTaxNo = signal(''); // OHEM.govID (XXXXX-XXXXXXX-X)
  protected readonly contactNumber = signal(''); // OHEM.mobile (XXXX-XXXXXXX)
  protected readonly emergencyContactNumber = signal(''); // (XXXX-XXXXXXX)
  protected readonly street = signal(''); // OHEM.workStreet
  protected readonly streetNo = signal(''); // OHEM.StreetNoW
  protected readonly buildingFloorRoom = signal(''); // OHEM.WorkBuild
  protected readonly city = signal(''); // OHEM.workCity
  protected readonly state = signal<'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | ''>('');
  protected readonly country = signal(''); // OHEM.workCountr
  protected readonly zipCode = signal(''); // XXXXX

  // Education fields - array of education sections
  protected readonly educationSections = signal<Array<{
    institute: string;
    fromDate: string;
    toDate: string;
    subject: string;
    qualification: string;
    awardedQualification: string;
    marksGrades: string;
    notes: string;
  }>>([
    {
      institute: '',
      fromDate: '',
      toDate: '',
      subject: '',
      qualification: '',
      awardedQualification: '',
      marksGrades: '',
      notes: ''
    }
  ]);

  // Past Experience fields - array of past experience sections
  protected readonly pastExperienceSections = signal<Array<{
    company: string;
    position: string;
    fromDate: string;
    toDate: string;
    duties: string;
    remarks: string;
    lastSalary: string;
  }>>([
    {
      company: '',
      position: '',
      fromDate: '',
      toDate: '',
      duties: '',
      remarks: '',
      lastSalary: ''
    }
  ]);

  // Attachments fields
  protected readonly attachments = signal<Array<{
    type: 'CV' | 'Educational Certificates' | 'CNIC copy' | 'Experience letters' | 'Professional certificates' | 'Offer letter';
    file: File | null;
    fileName: string;
  }>>([
    { type: 'CV', file: null, fileName: '' },
    { type: 'Educational Certificates', file: null, fileName: '' },
    { type: 'CNIC copy', file: null, fileName: '' },
    { type: 'Experience letters', file: null, fileName: '' },
    { type: 'Professional certificates', file: null, fileName: '' },
    { type: 'Offer letter', file: null, fileName: '' }
  ]);

  // Remuneration fields
  protected readonly employeeMaster = signal(''); // OHEM reference
  protected readonly salaryStructure = signal(''); // Salary structure reference
  protected readonly attendanceShiftManagement = signal(''); // Attendance & Shift Management reference
  protected readonly leaveManagement = signal(''); // Leave Management reference
  protected readonly loanAdvancesForm = signal(''); // Loan & Advances Forms reference

  // Login Detail fields
  protected readonly employeeCode = signal(''); // Employee code
  protected readonly loginEmployeeName = signal(''); // Employee name
  protected readonly userId = signal(''); // User ID
  protected readonly password = signal(''); // Password

  // Create Job Requisition fields
  protected readonly reqId = signal('');
  protected readonly internalJobTitle = signal('');
  protected readonly hiringManager = signal('');
  protected readonly recruiter = signal('');
  protected readonly recruitmentCollaborator = signal('');
  protected readonly requisitionAdministrator = signal('');
  protected readonly recruitmentCoordinator = signal('');
  protected readonly hrAdministrator = signal('');

  protected readonly company = signal('No Selection');
  protected readonly department = signal('No Selection');
  protected readonly division = signal('No Selection');
  protected readonly location = signal('No Selection');
  protected readonly costCenter = signal('No Selection');

  protected readonly touched = signal<Record<string, boolean>>({});

  protected touch(field: string): void {
    this.touched.update(t => ({ ...t, [field]: true }));
  }

  private readonly cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
  private readonly phonePattern = /^\d{4}-\d{7}$/;
  private readonly zipPattern = /^\d{5}$/;

  private formatWithGroups(value: string, groups: number[]): string {
    const digits = value.replace(/\D/g, '');
    const maxDigits = groups.reduce((sum, group) => sum + group, 0);
    const trimmed = digits.slice(0, maxDigits);

    const parts: string[] = [];
    let index = 0;
    for (const groupSize of groups) {
      const next = trimmed.slice(index, index + groupSize);
      if (!next) {
        break;
      }
      parts.push(next);
      index += groupSize;
    }

    return parts.join('-');
  }

  protected onNationalIdCardNoChange(value: string): void {
    this.nationalIdCardNo.set(this.formatWithGroups(value, [5, 7, 1]));
  }

  protected onIncomeTaxNoChange(value: string): void {
    this.incomeTaxNo.set(this.formatWithGroups(value, [5, 7, 1]));
  }

  protected onContactNumberChange(value: string): void {
    this.contactNumber.set(this.formatWithGroups(value, [4, 7]));
  }

  protected onEmergencyContactNumberChange(value: string): void {
    this.emergencyContactNumber.set(this.formatWithGroups(value, [4, 7]));
  }

  protected onZipCodeChange(value: string): void {
    this.zipCode.set(value.replace(/\D/g, '').slice(0, 5));
  }

  protected readonly nationalIdCardNoInvalid = computed(() => {
    const v = this.nationalIdCardNo().trim();
    return v.length > 0 && !this.cnicPattern.test(v);
  });

  protected readonly incomeTaxNoInvalid = computed(() => {
    const v = this.incomeTaxNo().trim();
    return v.length > 0 && !this.cnicPattern.test(v);
  });

  protected readonly contactNumberInvalid = computed(() => {
    const v = this.contactNumber().trim();
    return v.length > 0 && !this.phonePattern.test(v);
  });

  protected readonly emergencyContactNumberInvalid = computed(() => {
    const v = this.emergencyContactNumber().trim();
    return v.length > 0 && !this.phonePattern.test(v);
  });

  protected readonly zipCodeInvalid = computed(() => {
    const v = this.zipCode().trim();
    return v.length > 0 && !this.zipPattern.test(v);
  });

  protected addEducationSection(): void {
    this.educationSections.update(sections => [
      ...sections,
      {
        institute: '',
        fromDate: '',
        toDate: '',
        subject: '',
        qualification: '',
        awardedQualification: '',
        marksGrades: '',
        notes: ''
      }
    ]);
  }

  protected updateEducationField(sectionIndex: number, field: string, value: string): void {
    this.educationSections.update(sections => {
      const updated = [...sections];
      updated[sectionIndex] = { ...updated[sectionIndex], [field]: value };
      return updated;
    });
  }

  protected addPastExperienceSection(): void {
    this.pastExperienceSections.update(sections => [
      ...sections,
      {
        company: '',
        position: '',
        fromDate: '',
        toDate: '',
        duties: '',
        remarks: '',
        lastSalary: ''
      }
    ]);
  }

  protected updatePastExperienceField(sectionIndex: number, field: string, value: string): void {
    this.pastExperienceSections.update(sections => {
      const updated = [...sections];
      updated[sectionIndex] = { ...updated[sectionIndex], [field]: value };
      return updated;
    });
  }

  protected onAttachmentChange(attachmentIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.attachments.update(attachments => {
        const updated = [...attachments];
        updated[attachmentIndex] = {
          ...updated[attachmentIndex],
          file,
          fileName: file.name
        };
        return updated;
      });
    }
  }

  protected removeAttachment(attachmentIndex: number): void {
    this.attachments.update(attachments => {
      const updated = [...attachments];
      updated[attachmentIndex] = {
        ...updated[attachmentIndex],
        file: null,
        fileName: ''
      };
      return updated;
    });
  }

  private intersectionObserver: IntersectionObserver | null = null;
  private sectionIds = ['personal-info-section', 'education-section', 'past-experience-section', 'remunation-section', 'login-detail-section', 'loan-section'];

  protected scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.viewportScroller.scrollToPosition([0, 0]);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeSection.set(entry.target.id);
        }
      });
    }, options);

    this.sectionIds.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element && this.intersectionObserver) {
        this.intersectionObserver.observe(element);
      }
    });
  }

  private destroyIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.destroyIntersectionObserver();
  }

  constructor(
    private readonly router: Router,
    private readonly viewportScroller: ViewportScroller,
    private readonly applicationFormService: ApplicationFormService
  ) { }

  protected back(): void {
    void this.router.navigateByUrl('/recruitment');
  }

  protected search(): void {
    // Placeholder for future integration
    console.log('Search clicked', {
      copyExisting: this.copyExisting(),
      reqId: this.reqId(),
      internalJobTitle: this.internalJobTitle(),
      hiringManager: this.hiringManager(),
      recruiter: this.recruiter(),
      recruitmentCollaborator: this.recruitmentCollaborator(),
      requisitionAdministrator: this.requisitionAdministrator(),
      recruitmentCoordinator: this.recruitmentCoordinator(),
      hrAdministrator: this.hrAdministrator(),
      educationSections: this.educationSections(),
      company: this.company(),
      department: this.department(),
      division: this.division(),
      location: this.location(),
      costCenter: this.costCenter()
    });
  }

  protected submitApplication(): void {
    const noSelection = (value: string): string => (value === 'No Selection' ? '' : value);

    const codeStr = this.employeeCode().trim();
    const parsedCode = parseInt(codeStr, 10);
    const employeeCodeNum =
      Number.isFinite(parsedCode) && parsedCode > 0 ? parsedCode : this.applicationFormService.getNextEmployeeCode();

    const loginName = this.loginEmployeeName().trim();
    const composedName = [this.firstName(), this.middleName(), this.lastName()]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ');
    const displayName =
      loginName || composedName || this.personName().trim() || `Applicant-${employeeCodeNum}`;

    const detail: ApplicationFormDetail = {
      personalInfo: {
        personName: this.personName(),
        firstName: this.firstName(),
        middleName: this.middleName(),
        lastName: this.lastName(),
        fatherOrHusbandName: this.fatherOrHusbandName(),
        gender: this.gender(),
        maritalStatus: this.maritalStatus(),
        dateOfBirth: this.dateOfBirth(),
        nationality: this.nationality(),
        religion: this.religion(),
        bloodGroup: this.bloodGroup(),
        nationalIdCardNo: this.nationalIdCardNo(),
        incomeTaxNo: this.incomeTaxNo(),
        contactNumber: this.contactNumber(),
        emergencyContactNumber: this.emergencyContactNumber(),
        street: this.street(),
        streetNo: this.streetNo(),
        buildingFloorRoom: this.buildingFloorRoom(),
        city: this.city(),
        state: this.state(),
        country: this.country(),
        zipCode: this.zipCode()
      },
      education: this.educationSections().map((row) => ({ ...row })),
      pastExperience: this.pastExperienceSections().map((row) => ({ ...row })),
      remuneration: {
        employeeMaster: this.employeeMaster(),
        salaryStructure: this.salaryStructure(),
        attendanceShiftManagement: this.attendanceShiftManagement(),
        leaveManagement: this.leaveManagement(),
        loanAdvancesForm: this.loanAdvancesForm()
      },
      loginDetails: {
        employeeCode: this.employeeCode(),
        employeeName: this.loginEmployeeName(),
        userId: this.userId(),
        password: this.password()
      },
      attachments: this.attachments().map((a) => ({
        type: a.type,
        fileName: a.fileName || (a.file ? a.file.name : '')
      })),
      requisition: {
        copyExisting: this.copyExisting(),
        reqId: this.reqId(),
        internalJobTitle: this.internalJobTitle(),
        hiringManager: this.hiringManager(),
        recruiter: this.recruiter(),
        recruitmentCollaborator: this.recruitmentCollaborator(),
        requisitionAdministrator: this.requisitionAdministrator(),
        recruitmentCoordinator: this.recruitmentCoordinator(),
        hrAdministrator: this.hrAdministrator(),
        company: this.company(),
        department: this.department(),
        division: this.division(),
        location: this.location(),
        costCenter: this.costCenter()
      }
    };

    const record: ApplicationFormRecord = {
      EmployeeCode: employeeCodeNum,
      EmployeeName: displayName,
      Department: noSelection(this.department()) || '—',
      EmployeeNature: noSelection(this.company()) || '—',
      Designation: this.internalJobTitle().trim() || '—',
      ReportingManager: this.hiringManager().trim() || '—',
      EmploymentType: noSelection(this.division()) || '—',
      EmploymentCategory: noSelection(this.costCenter()) || '—',
      status: 'Submitted',
      selected: false,
      detail
    };

    this.applicationFormService.addApplicationRecord(record);
    alert('Application submitted successfully!');
    void this.router.navigateByUrl('/recruitment');
  }
}