import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { AlertService } from '../../../../services/alert.service';
import {
  ApplicationFormDetail,
  ApplicationFormRecord,
  ApplicationFormService,
  EmployeeProfileAddPayload,
} from '../../../../services/application-form.service';
import {
  formatDateDdMmYyyyInput,
  formatDateOfBirthFromApi,
  formatDateOfBirthToApi,
  formatDateToApiIso,
} from '../../../../utils/date-format.util';

type AttachmentType =
  | 'CV'
  | 'Educational Certificates'
  | 'CNIC copy'
  | 'Experience letters'
  | 'Professional certificates'
  | 'Offer letter';

interface AttachmentRow {
  file: File | null;
  fileName: string;
  fileUrl: string;
}

interface AttachmentSection {
  type: AttachmentType;
  rows: AttachmentRow[];
}

const ATTACHMENT_TYPES: AttachmentType[] = [
  'CV',
  'Educational Certificates',
  'CNIC copy',
  'Experience letters',
  'Professional certificates',
  'Offer letter',
];

const DEFAULT_ATTACHMENT_SECTIONS: AttachmentSection[] = ATTACHMENT_TYPES.map((type) => ({
  type,
  rows: [{ file: null, fileName: '', fileUrl: '' }],
}));

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
  selector: 'app-create-job-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-job-requisition.html',
  styleUrl: './create-job-requisition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CreateJobRequisitionComponent implements OnInit, OnDestroy {
  protected readonly editingApiId = signal<string | null>(null);
  protected readonly submitButtonLabel = computed(() =>
    this.editingApiId() ? 'Update Application' : 'Submit Application',
  );
  protected readonly copyExisting = signal(true);
  protected readonly activeSection = signal('personal-info-section');
  // Personal Information (OHEM mappings where applicable)
  protected readonly personName = signal(''); // free text
  protected readonly firstName = signal(''); // OHEM.firstName
  protected readonly middleName = signal(''); // OHEM.middleName
  protected readonly lastName = signal(''); // OHEM.lastName
  protected readonly fatherOrHusbandName = signal(''); // free text
  protected readonly gender = signal<'Male' | 'Female' | 'Prefer not to say' | ''>('');
  protected readonly maritalStatus = signal<'Single' | 'Married' | ''>('');
  protected readonly dateOfBirth = signal(''); // DD-MM-YYYY
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
  protected readonly employmentNature = signal('');
  protected readonly employmentCategory = signal('');
  protected readonly employmentStatus = signal('');
  protected readonly departmentInAhcp = signal('');
  protected readonly departmentOptions = DEPARTMENT_OPTIONS;
  protected readonly designation = signal('');
  protected readonly jobDescription = signal('');
  protected readonly roleSalary = signal('');

  // Education fields - array of education sections
  protected readonly educationSections = signal<Array<{
    institute: string;
    institution: string;
    qualification: string;
    passingYear: string;
    fromDate: string;
    toDate: string;
    subject: string;
    awardedQualification: string;
    marksGrades: string;
    notes: string;
  }>>([
    {
      institute: '',
      institution: '',
      qualification: '',
      passingYear: '',
      fromDate: '',
      toDate: '',
      subject: '',
      awardedQualification: '',
      marksGrades: '',
      notes: '',
    },
  ]);

  // Past Experience fields - array of past experience sections
  protected readonly pastExperienceSections = signal<Array<{
    company: string;
    position: string;
    designation: string;
    duration: string;
    fromDate: string;
    toDate: string;
    duties: string;
    remarks: string;
    lastSalary: string;
  }>>([
    {
      company: '',
      position: '',
      designation: '',
      duration: '',
      fromDate: '',
      toDate: '',
      duties: '',
      remarks: '',
      lastSalary: '',
    },
  ]);

  // Attachments fields — one section per type, each with one or more file rows
  protected readonly attachmentSections = signal<AttachmentSection[]>(DEFAULT_ATTACHMENT_SECTIONS);

  // Remuneration fields
  protected readonly basicSalary = signal('');
  protected readonly paymentMode = signal('');
  protected readonly accountTitle = signal('');
  protected readonly bankName = signal('');
  protected readonly branchName = signal('');
  protected readonly accountNo = signal('');
  protected readonly accountType = signal('');
  protected readonly effectiveDate = signal('');
  protected readonly taxPercentage = signal('');
  protected readonly dateOfJoining = signal('');
  protected readonly advancePercentAllowed = signal('');
  protected readonly loanAmountAllowed = signal('');
  protected readonly overTimeApplicable = signal<'Yes' | 'No' | ''>('');
  protected readonly leaveType = signal('');
  protected readonly leaveDays = signal('');
  protected readonly leavesAvailed = signal('');
  protected readonly remainingLeaves = signal('');
  protected readonly totalLeaves = signal('');
  protected readonly medicalAllowances = signal('');
  protected readonly fuelAllowances = signal('');
  protected readonly mobileAllowances = signal('');
  protected readonly carAllowances = signal('');
  protected readonly maximumLoanCapacity = signal('');
  protected readonly maximumAdvanceCapacity = signal('');
  protected readonly otherAllowances = signal('');

  // HR / payroll settings
  protected readonly employeeMaster = signal('');
  protected readonly salaryStructure = signal('');
  protected readonly attendanceShiftManagement = signal('');
  protected readonly leaveManagement = signal('');
  protected readonly loanAdvancesForm = signal('');

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

  protected onIntegerOnlyChange(value: string, target: { set: (next: string) => void }): void {
    target.set(value.replace(/\D/g, ''));
  }

  protected onNumericOnlyChange(value: string, target: { set: (next: string) => void }): void {
    const sanitized = value.replace(/[^\d.]/g, '');
    const [whole, ...fraction] = sanitized.split('.');
    target.set(fraction.length ? `${whole}.${fraction.join('')}` : whole);
  }

  private buildRemunerationPayload(): ApplicationFormDetail['remuneration'] {
    return {
      basicSalary: this.basicSalary(),
      paymentMode: this.paymentMode(),
      accountTitle: this.accountTitle(),
      bankName: this.bankName(),
      branchName: this.branchName(),
      accountNo: this.accountNo(),
      accountType: this.accountType(),
      effectiveDate: this.effectiveDate(),
      taxPercentage: this.taxPercentage(),
      dateOfJoining: this.dateOfJoining(),
      advancePercentAllowed: this.advancePercentAllowed(),
      loanAmountAllowed: this.loanAmountAllowed(),
      overTimeApplicable: this.overTimeApplicable(),
      leaveType: this.leaveType(),
      leaveDays: this.leaveDays(),
      leavesAvailed: this.leavesAvailed(),
      remainingLeaves: this.remainingLeaves(),
      totalLeaves: this.totalLeaves(),
      medicalAllowances: this.medicalAllowances(),
      fuelAllowances: this.fuelAllowances(),
      mobileAllowances: this.mobileAllowances(),
      carAllowances: this.carAllowances(),
      maximumLoanCapacity: this.maximumLoanCapacity(),
      maximumAdvanceCapacity: this.maximumAdvanceCapacity(),
      otherAllowances: this.otherAllowances(),
    };
  }

  private buildHrSettingsPayload(): ApplicationFormDetail['hrSettings'] {
    return {
      employeeMaster: this.employeeMaster(),
      salaryStructure: this.salaryStructure(),
      attendanceShiftManagement: this.attendanceShiftManagement(),
      leaveManagement: this.leaveManagement(),
      loanAdvancesForm: this.loanAdvancesForm(),
      requestStatus: '',
    };
  }

  private parseNumericField(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private overTimeToBoolean(value: 'Yes' | 'No' | ''): boolean {
    return value === 'Yes';
  }

  protected onDateOfBirthChange(value: string): void {
    this.dateOfBirth.set(formatDateDdMmYyyyInput(value));
  }

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
        institution: '',
        qualification: '',
        passingYear: '',
        fromDate: '',
        toDate: '',
        subject: '',
        awardedQualification: '',
        marksGrades: '',
        notes: '',
      },
    ]);
  }

  protected updateEducationField(sectionIndex: number, field: string, value: string): void {
    this.educationSections.update(sections => {
      const updated = [...sections];
      const row = { ...updated[sectionIndex], [field]: value };
      if (field === 'institute' || field === 'institution') {
        row.institute = value;
        row.institution = value;
      }
      updated[sectionIndex] = row;
      return updated;
    });
  }

  protected removeEducationSection(sectionIndex: number): void {
    this.educationSections.update((sections) => {
      if (sections.length <= 1) {
        return sections;
      }
      return sections.filter((_, index) => index !== sectionIndex);
    });
  }

  protected addPastExperienceSection(): void {
    this.pastExperienceSections.update(sections => [
      ...sections,
      {
        company: '',
        position: '',
        designation: '',
        duration: '',
        fromDate: '',
        toDate: '',
        duties: '',
        remarks: '',
        lastSalary: '',
      },
    ]);
  }

  protected updatePastExperienceField(sectionIndex: number, field: string, value: string): void {
    this.pastExperienceSections.update(sections => {
      const updated = [...sections];
      const row = { ...updated[sectionIndex], [field]: value };
      if (field === 'position' || field === 'designation') {
        row.position = value;
        row.designation = value;
      }
      updated[sectionIndex] = row;
      return updated;
    });
  }

  protected updateAttachmentFileUrl(sectionIndex: number, rowIndex: number, value: string): void {
    this.attachmentSections.update((sections) =>
      sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }
        return {
          ...section,
          rows: section.rows.map((row, i) =>
            i === rowIndex ? { ...row, fileUrl: value } : row,
          ),
        };
      }),
    );
  }

  protected addAttachmentRow(sectionIndex: number): void {
    this.attachmentSections.update((sections) =>
      sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, rows: [...section.rows, this.createEmptyAttachmentRow()] }
          : section,
      ),
    );
  }

  protected removeAttachmentRow(sectionIndex: number, rowIndex: number): void {
    this.attachmentSections.update((sections) =>
      sections.map((section, index) => {
        if (index !== sectionIndex || section.rows.length <= 1) {
          return section;
        }
        return {
          ...section,
          rows: section.rows.filter((_, i) => i !== rowIndex),
        };
      }),
    );
  }

  protected onAttachmentChange(sectionIndex: number, rowIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.attachmentSections.update((sections) =>
        sections.map((section, index) => {
          if (index !== sectionIndex) {
            return section;
          }
          return {
            ...section,
            rows: section.rows.map((row, i) =>
              i === rowIndex ? { ...row, file, fileName: file.name } : row,
            ),
          };
        }),
      );
    }
  }

  protected clearAttachmentFile(sectionIndex: number, rowIndex: number): void {
    this.attachmentSections.update((sections) =>
      sections.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }
        return {
          ...section,
          rows: section.rows.map((row, i) =>
            i === rowIndex ? { ...row, file: null, fileName: '', fileUrl: '' } : row,
          ),
        };
      }),
    );
  }

  private createEmptyAttachmentRow(): AttachmentRow {
    return { file: null, fileName: '', fileUrl: '' };
  }

  private flattenAttachments(): Array<{
    type: AttachmentType;
    file: File | null;
    fileName: string;
    fileUrl: string;
  }> {
    return this.attachmentSections().flatMap((section) =>
      section.rows.map((row) => ({
        type: section.type,
        file: row.file,
        fileName: row.fileName || (row.file ? row.file.name : ''),
        fileUrl: row.fileUrl,
      })),
    );
  }

  private intersectionObserver: IntersectionObserver | null = null;
  private sectionIds = [
    'personal-info-section',
    'education-section',
    'past-experience-section',
    'attachments-section',
    'remunation-section',
    'login-detail-section',
  ];

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
    const editId = this.route.snapshot.paramMap.get('id');
    if (!editId) {
      return;
    }
    this.editingApiId.set(editId);
    this.applicationFormService.fetchEmployeeProfileDetail(editId).subscribe({
      next: (record) => {
        if (!record.detail) {
          this.alertService.warning('Edit', 'No profile details found for this employee.');
          return;
        }
        this.populateFromRecord(record);
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          'Failed to load employee profile for edit.';
        this.alertService.error('Load Failed', errorMessage);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroyIntersectionObserver();
  }

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly viewportScroller: ViewportScroller,
    private readonly applicationFormService: ApplicationFormService,
    private readonly alertService: AlertService,
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
      this.personName().trim() || composedName || loginName || `Applicant-${employeeCodeNum}`;

    const detail: ApplicationFormDetail = {
      personalInfo: {
        personName: this.personName(),
        firstName: this.firstName(),
        middleName: this.middleName(),
        lastName: this.lastName(),
        fatherOrHusbandName: this.fatherOrHusbandName(),
        gender: this.gender(),
        maritalStatus: this.maritalStatus(),
        dateOfBirth: formatDateOfBirthToApi(this.dateOfBirth()),
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
        zipCode: this.zipCode(),
        employmentNature: this.employmentNature(),
        employmentCategory: this.employmentCategory(),
        employmentStatus: this.employmentStatus(),
        departmentInAhcp: this.departmentInAhcp(),
        designation: this.designation(),
        jobDescription: this.jobDescription(),
        roleSalary: this.roleSalary(),
      },
      education: this.educationSections().map((row) => ({ ...row })),
      pastExperience: this.pastExperienceSections().map((row) => ({ ...row })),
      remuneration: this.buildRemunerationPayload(),
      hrSettings: this.buildHrSettingsPayload(),
      loginDetails: {
        employeeCode: this.employeeCode(),
        employeeName: this.loginEmployeeName(),
        userId: this.userId(),
        password: this.password()
      },
      attachments: this.flattenAttachments().map((a) => ({
        type: a.type,
        fileName: a.fileName || (a.file ? a.file.name : ''),
        fileUrl: a.fileUrl,
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
      Department: this.departmentInAhcp().trim() || '—',
      EmployeeNature: noSelection(this.employmentNature()) || '—',
      Designation: this.designation().trim() || '—',
      ReportingManager: this.hiringManager().trim() || '—',
      EmploymentType: noSelection(this.division()) || '—',
      EmploymentCategory: noSelection(this.employmentCategory()) || '—',
      status: noSelection(this.employmentStatus()) || 'Submitted',
      selected: false,
      detail
    };

    const payload: EmployeeProfileAddPayload = {
      personName: this.personName(),
      firstName: this.firstName(),
      middleName: this.middleName().trim() || null,
      lastName: this.lastName(),
      fatherOrHusbandName: this.fatherOrHusbandName(),
      gender: this.gender(),
      maritalStatus: this.maritalStatus(),
      dateOfBirth: formatDateToApiIso(formatDateOfBirthToApi(this.dateOfBirth())),
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
      zipCode: this.zipCode(),
      employmentNature: this.employmentNature(),
      employeeCategory: this.employmentCategory(),
      employmentStatus: this.employmentStatus(),
      department: this.departmentInAhcp(),
      designation: this.designation(),
      jobDescription: this.jobDescription(),
      roleSalary: this.roleSalary(),
      educationSections: this.educationSections().map((row) => ({
        qualification: row.qualification,
        institution: row.institution || row.institute,
        passingYear: row.passingYear,
      })),
      pastExperienceSections: this.pastExperienceSections().map((row) => ({
        company: row.company,
        designation: row.designation || row.position,
        duration: row.duration,
      })),
      attachments: this.flattenAttachments()
        .filter((a) => a.fileName || a.fileUrl)
        .map((a) => ({
          fileName: a.fileName || (a.file ? a.file.name : ''),
          fileUrl: a.fileUrl,
        })),
      basicSalary: this.basicSalary(),
      paymentMode: this.paymentMode(),
      accountTitle: this.accountTitle(),
      bankName: this.bankName(),
      branchName: this.branchName(),
      accountNo: this.accountNo(),
      accountType: this.accountType(),
      effectiveDate: formatDateToApiIso(this.effectiveDate()),
      taxPercentage: this.taxPercentage(),
      dateOfJoining: formatDateToApiIso(this.dateOfJoining()),
      advancePercentAllowed: this.advancePercentAllowed(),
      loanAmountAllowed: this.loanAmountAllowed(),
      overTimeApplicable: this.overTimeToBoolean(this.overTimeApplicable()),
      leaveType: this.leaveType(),
      leaveDays: this.parseNumericField(this.leaveDays()),
      leavesAvailed: this.parseNumericField(this.leavesAvailed()),
      remainingLeaves: this.parseNumericField(this.remainingLeaves()),
      totalLeaves: this.parseNumericField(this.totalLeaves()),
      employeeMaster: this.parseNumericField(this.employeeMaster()),
      salaryStructure: this.salaryStructure(),
      attendanceShiftManagement: this.attendanceShiftManagement(),
      leaveManagement: this.leaveManagement(),
      loanAdvancesForm: this.loanAdvancesForm(),
      employeeCode: this.employeeCode(),
      userId: this.parseNumericField(this.userId()) || this.userId(),
      loginEmployeeName: this.loginEmployeeName(),
      password: this.password(),
    };

    const editId = this.editingApiId();
    const request$ = editId
      ? this.applicationFormService.updateEmployeeProfile(editId, payload)
      : this.applicationFormService.addEmployeeProfile(payload);

    request$.subscribe({
      next: () => {
        if (!editId) {
          this.applicationFormService.addApplicationRecord(record);
        }
        this.alertService.success(
          'Success',
          editId ? 'Employee profile updated successfully.' : 'Application submitted successfully.',
        );
        void this.router.navigateByUrl('/recruitment');
      },
      error: (error: unknown) => {
        const errorMessage =
          (error as { error?: { message?: string } })?.error?.message ||
          (error as { message?: string })?.message ||
          (editId ? 'Failed to update employee profile.' : 'Failed to submit application form.');
        this.alertService.error(editId ? 'Update Failed' : 'Submission Failed', errorMessage);
      },
    });
  }

  private populateFromRecord(record: ApplicationFormRecord): void {
    const detail = record.detail;
    if (!detail) {
      return;
    }

    this.personName.set(detail.personalInfo.personName);
    this.firstName.set(detail.personalInfo.firstName);
    this.middleName.set(detail.personalInfo.middleName);
    this.lastName.set(detail.personalInfo.lastName);
    this.fatherOrHusbandName.set(detail.personalInfo.fatherOrHusbandName);
    this.gender.set((detail.personalInfo.gender as 'Male' | 'Female' | 'Prefer not to say' | '') ?? '');
    this.maritalStatus.set((detail.personalInfo.maritalStatus as 'Single' | 'Married' | '') ?? '');
    this.dateOfBirth.set(formatDateOfBirthFromApi(detail.personalInfo.dateOfBirth));
    this.nationality.set(detail.personalInfo.nationality);
    this.religion.set(detail.personalInfo.religion);
    this.bloodGroup.set(detail.personalInfo.bloodGroup);
    this.nationalIdCardNo.set(detail.personalInfo.nationalIdCardNo);
    this.incomeTaxNo.set(detail.personalInfo.incomeTaxNo);
    this.contactNumber.set(detail.personalInfo.contactNumber);
    this.emergencyContactNumber.set(detail.personalInfo.emergencyContactNumber);
    this.street.set(detail.personalInfo.street);
    this.streetNo.set(detail.personalInfo.streetNo);
    this.buildingFloorRoom.set(detail.personalInfo.buildingFloorRoom);
    this.city.set(detail.personalInfo.city);
    this.state.set((detail.personalInfo.state as 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | '') ?? '');
    this.country.set(detail.personalInfo.country);
    this.zipCode.set(detail.personalInfo.zipCode);
    this.employmentNature.set(
      detail.personalInfo.employmentNature ||
        (record.EmployeeNature !== '—' ? record.EmployeeNature : ''),
    );
    this.employmentCategory.set(
      detail.personalInfo.employmentCategory ||
        (record.EmploymentCategory !== '—' ? record.EmploymentCategory : ''),
    );
    this.employmentStatus.set(
      detail.personalInfo.employmentStatus || (record.status !== '—' ? record.status : ''),
    );
    this.departmentInAhcp.set(
      detail.personalInfo.departmentInAhcp || (record.Department !== '—' ? record.Department : ''),
    );
    this.designation.set(
      detail.personalInfo.designation ||
        (record.Designation !== '—' ? record.Designation : detail.requisition.internalJobTitle),
    );
    this.jobDescription.set(detail.personalInfo.jobDescription);
    this.roleSalary.set(detail.personalInfo.roleSalary);

    this.educationSections.set(
      detail.education.length
        ? detail.education.map((row) => ({
            ...row,
            institute: row.institute || row.institution,
            institution: row.institution || row.institute,
          }))
        : [{
            institute: '',
            institution: '',
            qualification: '',
            passingYear: '',
            fromDate: '',
            toDate: '',
            subject: '',
            awardedQualification: '',
            marksGrades: '',
            notes: '',
          }],
    );

    this.pastExperienceSections.set(
      detail.pastExperience.length
        ? detail.pastExperience.map((row) => ({
            ...row,
            position: row.position || row.designation,
            designation: row.designation || row.position,
          }))
        : [{
            company: '',
            position: '',
            designation: '',
            duration: '',
            fromDate: '',
            toDate: '',
            duties: '',
            remarks: '',
            lastSalary: '',
          }],
    );

    const remuneration = detail.remuneration;
    this.basicSalary.set(remuneration.basicSalary ?? '');
    this.paymentMode.set(remuneration.paymentMode ?? '');
    this.accountTitle.set(remuneration.accountTitle ?? '');
    this.bankName.set(remuneration.bankName ?? '');
    this.branchName.set(remuneration.branchName ?? '');
    this.accountNo.set(remuneration.accountNo ?? '');
    this.accountType.set(remuneration.accountType ?? '');
    this.effectiveDate.set(remuneration.effectiveDate ?? '');
    this.taxPercentage.set(remuneration.taxPercentage ?? '');
    this.dateOfJoining.set(remuneration.dateOfJoining ?? '');
    this.advancePercentAllowed.set(remuneration.advancePercentAllowed ?? '');
    this.loanAmountAllowed.set(remuneration.loanAmountAllowed ?? '');
    this.overTimeApplicable.set((remuneration.overTimeApplicable as 'Yes' | 'No' | '') ?? '');
    this.leaveType.set(remuneration.leaveType ?? '');
    this.leaveDays.set(remuneration.leaveDays ?? '');
    this.leavesAvailed.set(remuneration.leavesAvailed ?? '');
    this.remainingLeaves.set(remuneration.remainingLeaves ?? '');
    this.totalLeaves.set(remuneration.totalLeaves ?? '');
    this.medicalAllowances.set(remuneration.medicalAllowances ?? '');
    this.fuelAllowances.set(remuneration.fuelAllowances ?? '');
    this.mobileAllowances.set(remuneration.mobileAllowances ?? '');
    this.carAllowances.set(remuneration.carAllowances ?? '');
    this.maximumLoanCapacity.set(remuneration.maximumLoanCapacity ?? '');
    this.maximumAdvanceCapacity.set(remuneration.maximumAdvanceCapacity ?? '');
    this.otherAllowances.set(remuneration.otherAllowances ?? '');

    const hrSettings = detail.hrSettings;
    if (hrSettings) {
      this.employeeMaster.set(hrSettings.employeeMaster ?? '');
      this.salaryStructure.set(hrSettings.salaryStructure ?? '');
      this.attendanceShiftManagement.set(hrSettings.attendanceShiftManagement ?? '');
      this.leaveManagement.set(hrSettings.leaveManagement ?? '');
      this.loanAdvancesForm.set(hrSettings.loanAdvancesForm ?? '');
    }

    this.employeeCode.set(detail.loginDetails.employeeCode);
    this.userId.set(detail.loginDetails.userId);
    this.loginEmployeeName.set(detail.loginDetails.employeeName);
    this.password.set(detail.loginDetails.password);

    if (detail.attachments.length) {
      this.attachmentSections.set(
        ATTACHMENT_TYPES.map((type) => {
          const rows = detail.attachments
            .filter((attachment) => attachment.type === type)
            .map((attachment) => ({
              file: null,
              fileName: attachment.fileName ?? '',
              fileUrl: attachment.fileUrl ?? '',
            }));
          return {
            type,
            rows: rows.length ? rows : [this.createEmptyAttachmentRow()],
          };
        }),
      );
    }

    const req = detail.requisition;
    this.copyExisting.set(req.copyExisting);
    this.reqId.set(req.reqId);
    this.internalJobTitle.set(req.internalJobTitle);
    this.hiringManager.set(req.hiringManager);
    this.recruiter.set(req.recruiter);
    this.recruitmentCollaborator.set(req.recruitmentCollaborator);
    this.requisitionAdministrator.set(req.requisitionAdministrator);
    this.recruitmentCoordinator.set(req.recruitmentCoordinator);
    this.hrAdministrator.set(req.hrAdministrator);
    this.company.set(req.company || 'No Selection');
    this.department.set(req.department || 'No Selection');
    this.division.set(req.division || 'No Selection');
    this.location.set(req.location || 'No Selection');
    this.costCenter.set(req.costCenter || 'No Selection');
  }
}