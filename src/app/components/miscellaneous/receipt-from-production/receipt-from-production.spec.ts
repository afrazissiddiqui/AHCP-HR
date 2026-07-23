import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ReceiptFromProduction } from './receipt-from-production';
import { ReceiptFromProductionService } from './receipt-from-production.service';

describe('ReceiptFromProduction', () => {
  let fixture: ComponentFixture<ReceiptFromProduction>;
  let component: ReceiptFromProduction;
  let service: jasmine.SpyObj<ReceiptFromProductionService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('ReceiptFromProductionService', ['list']);
    service.list.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ReceiptFromProduction],
      providers: [{ provide: ReceiptFromProductionService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptFromProduction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the add button label', () => {
    const button = fixture.nativeElement.querySelector('.btn-default');
    expect(button?.textContent).toContain('Add Receipt from Production');
  });
});
