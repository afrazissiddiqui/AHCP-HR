import { Injectable, signal } from '@angular/core';

/** Extended payload captured from Create Application Form — shown in Application Form view modal only. */
export interface ApplicationFormPersonalInfo {
  personName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherOrHusbandName: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  nationality: string;
  religion: string;
  bloodGroup: string;
  nationalIdCardNo: string;
  incomeTaxNo: string;
  contactNumber: string;
  emergencyContactNumber: string;
  street: string;
  streetNo: string;
  buildingFloorRoom: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface ApplicationFormEducationRow {
  institute: string;
  fromDate: string;
  toDate: string;
  subject: string;
  qualification: string;
  awardedQualification: string;
  marksGrades: string;
  notes: string;
}

export interface ApplicationFormPastExperienceRow {
  company: string;
  position: string;
  fromDate: string;
  toDate: string;
  duties: string;
  remarks: string;
  lastSalary: string;
}

export interface ApplicationFormRemuneration {
  employeeMaster: string;
  salaryStructure: string;
  attendanceShiftManagement: string;
  leaveManagement: string;
  loanAdvancesForm: string;
}

export interface ApplicationFormLoginDetails {
  employeeCode: string;
  employeeName: string;
  userId: string;
  password: string;
}

export interface ApplicationFormAttachmentMeta {
  type: string;
  fileName: string;
}

export interface ApplicationFormRequisition {
  copyExisting: boolean;
  reqId: string;
  internalJobTitle: string;
  hiringManager: string;
  recruiter: string;
  recruitmentCollaborator: string;
  requisitionAdministrator: string;
  recruitmentCoordinator: string;
  hrAdministrator: string;
  company: string;
  department: string;
  division: string;
  location: string;
  costCenter: string;
}

export interface ApplicationFormDetail {
  personalInfo: ApplicationFormPersonalInfo;
  education: ApplicationFormEducationRow[];
  pastExperience: ApplicationFormPastExperienceRow[];
  remuneration: ApplicationFormRemuneration;
  loginDetails: ApplicationFormLoginDetails;
  attachments: ApplicationFormAttachmentMeta[];
  requisition: ApplicationFormRequisition;
}

export interface ApplicationFormRecord {
  EmployeeCode: number;
  EmployeeName: string;
  Department: string;
  EmployeeNature: string;
  Designation: string;
  ReportingManager: string;
  EmploymentType: string;
  EmploymentCategory: string;
  status: string;
  selected?: boolean;
  /** Populated when the record is saved from Create Application Form */
  detail?: ApplicationFormDetail;
}

export interface EmployeeMasterDataRecord {
  EmployeeID: number;
  EmployeeName: string;
  Department: string;
  Designation: string;
  EmploymentType: string;
  EmployeeCategory: string;
  WorkLevel: string;
  EmploymentStatus: string;
  selected: boolean;
}

/** Seed rows aligned with Create Application Form: table columns match submit mapping; `detail` mirrors saved payload. */
function createApplicationFormSeedRecords(): ApplicationFormRecord[] {
  const attachmentTypes = [
    'CV',
    'Educational Certificates',
    'CNIC copy',
    'Experience letters',
    'Professional certificates',
    'Offer letter'
  ] as const;

  const sampleAttachments = (prefix: string): ApplicationFormAttachmentMeta[] =>
    attachmentTypes.map((type) => ({
      type,
      fileName:
        type === 'CV'
          ? `${prefix}_CV.pdf`
          : type === 'CNIC copy'
            ? `${prefix}_CNIC.pdf`
            : type === 'Educational Certificates'
              ? `${prefix}_degrees.pdf`
              : type === 'Experience letters'
                ? `${prefix}_experience.pdf`
                : type === 'Professional certificates'
                  ? `${prefix}_certs.pdf`
                  : `${prefix}_offer.pdf`
    }));

  const r1: ApplicationFormRecord = {
    EmployeeCode: 1001,
    EmployeeName: 'Ahmed Khan',
    Department: 'Human Resources',
    EmployeeNature: 'AHCP Holdings',
    Designation: 'HR Specialist',
    ReportingManager: 'Sara Malik',
    EmploymentType: 'Corporate Division',
    EmploymentCategory: 'CC-HR-001',
    status: 'Submitted',
    selected: false,
    detail: {
      personalInfo: {
        personName: 'Syed Ahmed Khan',
        firstName: 'Ahmed',
        middleName: '',
        lastName: 'Khan',
        fatherOrHusbandName: 'Syed Rauf Khan',
        gender: 'Male',
        maritalStatus: 'Married',
        dateOfBirth: '1990-04-15',
        nationality: 'Pakistani',
        religion: 'Islam',
        bloodGroup: 'B+',
        nationalIdCardNo: '35202-1234567-1',
        incomeTaxNo: '35202-9876543-2',
        contactNumber: '0300-1122334',
        emergencyContactNumber: '0300-5566778',
        street: 'Garden Town Main Boulevard',
        streetNo: '42-A',
        buildingFloorRoom: 'Floor 2, Office 12',
        city: 'Lahore',
        state: 'Punjab',
        country: 'Pakistan',
        zipCode: '54000'
      },
      education: [
        {
          institute: 'University of Engineering & Technology, Lahore',
          fromDate: '2008-09',
          toDate: '2012-06',
          subject: 'Industrial Engineering',
          qualification: 'BSc',
          awardedQualification: 'Bachelor of Science',
          marksGrades: '3.42 CGPA',
          notes: 'Dean’s list final year'
        },
        {
          institute: 'LUMS',
          fromDate: '2014-01',
          toDate: '2016-12',
          subject: 'Human Resource Management',
          qualification: 'MBA',
          awardedQualification: 'Master of Business Administration',
          marksGrades: '3.65 CGPA',
          notes: ''
        }
      ],
      pastExperience: [
        {
          company: 'Metro Industries Pvt Ltd',
          position: 'HR Assistant',
          fromDate: '2017-01',
          toDate: '2020-06',
          duties: 'Recruitment coordination, onboarding, payroll support',
          remarks: 'Promoted to Senior Assistant',
          lastSalary: '85000'
        },
        {
          company: 'Alpha Logistics',
          position: 'Senior HR Associate',
          fromDate: '2020-07',
          toDate: '2024-12',
          duties: 'Policy rollout, employee relations, LMS admin',
          remarks: '',
          lastSalary: '125000'
        }
      ],
      remuneration: {
        employeeMaster: 'EM-HR-0142',
        salaryStructure: 'SS-GRADE-5',
        attendanceShiftManagement: 'ASM-CORP-LHR',
        leaveManagement: 'LM-STANDARD-PK',
        loanAdvancesForm: 'LAF-NONE'
      },
      loginDetails: {
        employeeCode: '1001',
        employeeName: 'Ahmed Khan',
        userId: 'ahmed.khan',
        password: 'Welcome@1001'
      },
      attachments: sampleAttachments('Ahmed_Khan'),
      requisition: {
        copyExisting: true,
        reqId: 'REQ-2026-101',
        internalJobTitle: 'HR Specialist',
        hiringManager: 'Sara Malik',
        recruiter: 'Fatima Noor',
        recruitmentCollaborator: 'Omar Siddiqui',
        requisitionAdministrator: 'HR Admin Pool',
        recruitmentCoordinator: 'Nadia Javed',
        hrAdministrator: 'Kamran Ali',
        company: 'AHCP Holdings',
        department: 'Human Resources',
        division: 'Corporate Division',
        location: 'Lahore HQ',
        costCenter: 'CC-HR-001'
      }
    }
  };

  const r2: ApplicationFormRecord = {
    EmployeeCode: 1002,
    EmployeeName: 'Ayesha Siddiqui',
    Department: 'Information Technology',
    EmployeeNature: 'AHCP Digital',
    Designation: 'Software Engineer',
    ReportingManager: 'Bilal Hussain',
    EmploymentType: 'Technology Division',
    EmploymentCategory: 'CC-IT-002',
    status: 'Submitted',
    selected: false,
    detail: {
      personalInfo: {
        personName: 'Ayesha Siddiqui',
        firstName: 'Ayesha',
        middleName: '',
        lastName: 'Siddiqui',
        fatherOrHusbandName: 'Tariq Siddiqui',
        gender: 'Female',
        maritalStatus: 'Single',
        dateOfBirth: '1996-11-03',
        nationality: 'Pakistani',
        religion: 'Islam',
        bloodGroup: 'O+',
        nationalIdCardNo: '42101-2233445-6',
        incomeTaxNo: '42101-9988776-1',
        contactNumber: '0321-4455667',
        emergencyContactNumber: '0321-7788990',
        street: 'Clifton Block 8',
        streetNo: '18',
        buildingFloorRoom: 'Apartment 4B',
        city: 'Karachi',
        state: 'Sindh',
        country: 'Pakistan',
        zipCode: '75600'
      },
      education: [
        {
          institute: 'FAST-NUCES Karachi',
          fromDate: '2014-08',
          toDate: '2018-05',
          subject: 'Computer Science',
          qualification: 'BS',
          awardedQualification: 'Bachelor of Science',
          marksGrades: '3.78 CGPA',
          notes: 'FYP: HR portal integration'
        }
      ],
      pastExperience: [
        {
          company: 'CloudNest Solutions',
          position: 'Associate Developer',
          fromDate: '2018-07',
          toDate: '2022-03',
          duties: 'Angular APIs, REST services, code reviews',
          remarks: '',
          lastSalary: '140000'
        }
      ],
      remuneration: {
        employeeMaster: 'EM-IT-2208',
        salaryStructure: 'SS-GRADE-6',
        attendanceShiftManagement: 'ASM-IT-KHI',
        leaveManagement: 'LM-STANDARD-PK',
        loanAdvancesForm: 'LAF-VEHICLE-POOL'
      },
      loginDetails: {
        employeeCode: '1002',
        employeeName: 'Ayesha Siddiqui',
        userId: 'ayesha.siddiqui',
        password: 'Welcome@1002'
      },
      attachments: sampleAttachments('Ayesha_Siddiqui'),
      requisition: {
        copyExisting: false,
        reqId: 'REQ-2026-118',
        internalJobTitle: 'Software Engineer',
        hiringManager: 'Bilal Hussain',
        recruiter: 'Hiring Team Karachi',
        recruitmentCollaborator: 'Sana Irfan',
        requisitionAdministrator: 'IT TA Desk',
        recruitmentCoordinator: 'Rehan Masood',
        hrAdministrator: 'Kamran Ali',
        company: 'AHCP Digital',
        department: 'Information Technology',
        division: 'Technology Division',
        location: 'Karachi Office',
        costCenter: 'CC-IT-002'
      }
    }
  };

  const r3: ApplicationFormRecord = {
    EmployeeCode: 1003,
    EmployeeName: 'Hassan Raza',
    Department: 'Finance & Accounts',
    EmployeeNature: 'AHCP Holdings',
    Designation: 'Financial Analyst',
    ReportingManager: 'Zainab Akhtar',
    EmploymentType: 'Finance Division',
    EmploymentCategory: 'CC-FIN-003',
    status: 'Active',
    selected: false,
    detail: {
      personalInfo: {
        personName: 'Hassan Raza',
        firstName: 'Hassan',
        middleName: 'Ali',
        lastName: 'Raza',
        fatherOrHusbandName: 'Muhammad Raza',
        gender: 'Male',
        maritalStatus: 'Married',
        dateOfBirth: '1992-07-22',
        nationality: 'Pakistani',
        religion: 'Islam',
        bloodGroup: 'A+',
        nationalIdCardNo: '37405-3344556-7',
        incomeTaxNo: '37405-2233445-8',
        contactNumber: '0333-6677889',
        emergencyContactNumber: '0333-9900112',
        street: 'F-7 Markaz',
        streetNo: '7',
        buildingFloorRoom: 'Office Tower 3, Floor 5',
        city: 'Islamabad',
        state: 'Punjab',
        country: 'Pakistan',
        zipCode: '44000'
      },
      education: [
        {
          institute: 'Quaid-i-Azam University',
          fromDate: '2010-09',
          toDate: '2014-06',
          subject: 'Economics & Finance',
          qualification: 'BSc',
          awardedQualification: 'Bachelor of Science',
          marksGrades: '3.55 CGPA',
          notes: ''
        },
        {
          institute: 'IBA Karachi',
          fromDate: '2016-01',
          toDate: '2017-12',
          subject: 'Finance',
          qualification: 'MS',
          awardedQualification: 'Master of Science',
          marksGrades: '3.70 CGPA',
          notes: 'Evening program'
        }
      ],
      pastExperience: [
        {
          company: 'National Bank subsidiary',
          position: 'Credit Analyst',
          fromDate: '2018-02',
          toDate: '2021-08',
          duties: 'Credit memos, covenant monitoring',
          remarks: '',
          lastSalary: '155000'
        }
      ],
      remuneration: {
        employeeMaster: 'EM-FIN-0881',
        salaryStructure: 'SS-GRADE-5',
        attendanceShiftManagement: 'ASM-FIN-ISB',
        leaveManagement: 'LM-STANDARD-PK',
        loanAdvancesForm: 'LAF-HOUSING'
      },
      loginDetails: {
        employeeCode: '1003',
        employeeName: 'Hassan Raza',
        userId: 'hassan.raza',
        password: 'Welcome@1003'
      },
      attachments: sampleAttachments('Hassan_Raza'),
      requisition: {
        copyExisting: true,
        reqId: 'REQ-2026-095',
        internalJobTitle: 'Financial Analyst',
        hiringManager: 'Zainab Akhtar',
        recruiter: 'Finance TA',
        recruitmentCollaborator: 'Usman Farooq',
        requisitionAdministrator: 'Finance Ops',
        recruitmentCoordinator: 'Mehreen Anwar',
        hrAdministrator: 'Kamran Ali',
        company: 'AHCP Holdings',
        department: 'Finance & Accounts',
        division: 'Finance Division',
        location: 'Islamabad Regional Office',
        costCenter: 'CC-FIN-003'
      }
    }
  };

  return [r1, r2, r3];
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationFormService {
  private readonly applicationRecords = signal<ApplicationFormRecord[]>(createApplicationFormSeedRecords());

  getApplicationRecords(): ApplicationFormRecord[] {
    return this.applicationRecords();
  }

  getNextEmployeeCode(): number {
    const records = this.applicationRecords();
    if (records.length === 0) {
      return 1;
    }
    return Math.max(...records.map((r) => r.EmployeeCode)) + 1;
  }

  addApplicationRecord(record: ApplicationFormRecord): void {
    this.applicationRecords.update((list) => [...list, record]);
  }

  getEmployeeMasterDataRecords(): EmployeeMasterDataRecord[] {
    return this.applicationRecords().map((record) => ({
      EmployeeID: record.EmployeeCode,
      EmployeeName: record.EmployeeName,
      Department: record.Department,
      Designation: record.Designation,
      EmploymentType: record.EmploymentType,
      EmployeeCategory: record.EmploymentCategory,
      WorkLevel: record.EmployeeNature,
      EmploymentStatus: record.status,
      selected: record.selected ?? false
    }));
  }
}
