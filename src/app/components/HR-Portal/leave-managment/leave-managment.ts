import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { SidebarComponent, SidebarItem, SidebarSection } from '../../sidebar/sidebar';

@Component({
  selector: 'app-leave-managment',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './leave-managment.html',
  styleUrl: './leave-managment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LeaveManagmentComponent implements OnInit, OnDestroy {
  protected readonly sidebarItems: SidebarItem[] = [
    { id: 'leave-management-list', label: 'Leave Management', route: '/leave-managment' }
  ];

  protected readonly sidebarSections: SidebarSection[] = [
    {
      id: 'leave-actions',
      title: 'Leave Actions',
      items: [
        { id: 'leave-create', label: 'Create Leave Request', route: '/leave-managment/create' },
        { id: 'leave-records', label: 'View existing leave records', route: '/leave-managment' }
      ]
    }
  ];

  protected readonly activeSidebarItemId = signal('leave-create');

  protected readonly copyExisting = signal(true);
  protected readonly activeSection = signal('personal-info-section');
  protected readonly personName = signal('');
  protected readonly firstName = signal('');
  protected readonly middleName = signal('');
  protected readonly lastName = signal('');
  protected readonly fatherOrHusbandName = signal('');
  protected readonly gender = signal<'Male' | 'Female' | ''>('');
  protected readonly maritalStatus = signal<'Single' | 'Married' | ''>('');
  protected readonly dateOfBirth = signal('');
  protected readonly nationality = signal('');
  protected readonly religion = signal('');
  protected readonly bloodGroup = signal('');
  protected readonly nationalIdCardNo = signal('');
  protected readonly incomeTaxNo = signal('');
  protected readonly contactNumber = signal('');
  protected readonly emergencyContactNumber = signal('');
  protected readonly street = signal('');
  protected readonly streetNo = signal('');
  protected readonly buildingFloorRoom = signal('');
  protected readonly city = signal('');
  protected readonly state = signal<'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | ''>('');
  protected readonly country = signal('');
  protected readonly zipCode = signal('');

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

  protected readonly employeeMaster = signal('');
  protected readonly salaryStructure = signal('');
  protected readonly attendanceShiftManagement = signal('');
  protected readonly leaveManagement = signal('');
  protected readonly loanAdvancesForm = signal('');

  protected readonly employeeCode = signal('');
  protected readonly loginEmployeeName = signal('');
  protected readonly userId = signal('');
  protected readonly password = signal('');

  protected readonly documentNo = signal('');
  protected readonly requestDate = signal('');
  protected readonly employeeId = signal('');
  protected readonly employeeName = signal('');
  protected readonly headerDepartment = signal('');
  protected readonly designation = signal('');
  protected readonly workLocation = signal('');
  protected readonly causeOfLeave = signal('');
  protected readonly leaveType = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly leaveDays = signal('');
  protected readonly requestStatus = signal<'Submitted' | 'Approved' | 'Rejected' | ''>('');
  protected readonly remarks = signal('');

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

  constructor(private readonly router: Router, private readonly viewportScroller: ViewportScroller) { }

  protected back(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  protected search(): void {
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
    console.log('Application submitted', {
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
      education: this.educationSections(),
      pastExperience: this.pastExperienceSections(),
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
      leaveRequestHeader: {
        documentNo: this.documentNo(),
        requestDate: this.requestDate(),
        employeeId: this.employeeId(),
        employeeName: this.employeeName(),
        department: this.headerDepartment(),
        designation: this.designation(),
        location: this.workLocation(),
        causeOfLeave: this.causeOfLeave(),
        leaveType: this.leaveType(),
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        leaveDays: this.leaveDays(),
        requestStatus: this.requestStatus(),
        remarks: this.remarks()
      },
      attachments: this.attachments()
    });
    alert('Application submitted successfully!');
  }

  protected onFolderSelected(folderId: string): void {
    this.activeSidebarItemId.set(folderId);
  }

  protected onManageFolders(): void {
    console.log('Manage folders clicked');
  }
}

