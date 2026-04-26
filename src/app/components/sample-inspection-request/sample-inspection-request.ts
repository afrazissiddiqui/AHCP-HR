import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-sample-inspection-request',
  imports: [],
  templateUrl: './sample-inspection-request.html',
  styleUrl: './sample-inspection-request.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SampleInspectionRequest {
  sirList = [
    {
      sirNo: "SIR-001",
      igpNo: "IGP-1001",
      bpCode: "BP001",
      bpName: "ABC Pharma",
      status: "Submitted",
    },
    {
      sirNo: "SIR-002",
      igpNo: "IGP-1002",
      bpCode: "BP002",
      bpName: "XYZ Chemicals",
      status: "Approved",
    },
  ];

  columns = [
    { key: "sirNo", label: "SIR NO" },
    { key: "igpNo", label: "IGP NO" },
    { key: "bpCode", label: "BP Code" },
    { key: "bpName", label: "BP Name" },
    { key: "status", label: "Status" },
  ];

  createNewSIR(): void {
    console.log("Create New SIR clicked");
  }
}
