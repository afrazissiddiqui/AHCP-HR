import { describe, expect, it } from 'vitest';
import { buildAuthorizationTemplate, isPermissionGranted, permissionKey } from './user-authorization.util';

describe('user authorization template', () => {
  it('keeps KPI and ITR setup permissions available for the user setup form', () => {
    const template = buildAuthorizationTemplate([
      { ITR_Setup_Form_add: 0, KPI_Setup_form_list: 1 },
    ]);

    const itrModule = template.find((module) => Object.prototype.hasOwnProperty.call(module, permissionKey('itr_setup_form', 'add')));
    const kpiModule = template.find((module) => Object.prototype.hasOwnProperty.call(module, permissionKey('kpi_setup_form', 'list')));

    expect(itrModule?.[permissionKey('itr_setup_form', 'add')]).toBe(1);
    expect(kpiModule?.[permissionKey('kpi_setup_form', 'list')]).toBe(0);
    expect(permissionKey('kpi_setup_form', 'add')).toBe('ITR_Setup_Form_add');
  });

  it('resolves permissions for the new setup modules', () => {
    const template = buildAuthorizationTemplate([
      { KPI_Setup_form_list: 0 },
    ]);

    expect(isPermissionGranted(template, 'kpi_setup_form', 'list')).toBe(true);
    expect(isPermissionGranted(template, 'itr_setup_form', 'add')).toBe(false);
  });
});
