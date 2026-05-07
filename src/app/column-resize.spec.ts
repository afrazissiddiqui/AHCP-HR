/// <reference types="vitest" />
import { TestBed } from '@angular/core/testing';
import { ElementRef, Renderer2 } from '@angular/core';
import { ColumnResizeDirective } from './column-resize';

describe('ColumnResizeDirective', () => {
  let directive: ColumnResizeDirective;
  let mockElementRef: ElementRef;
  let mockRenderer2: Renderer2;

  beforeEach(() => {
    mockElementRef = TestBed.inject(ElementRef);
    mockRenderer2 = TestBed.inject(Renderer2);
    directive = new ColumnResizeDirective(mockElementRef, mockRenderer2);
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });
});