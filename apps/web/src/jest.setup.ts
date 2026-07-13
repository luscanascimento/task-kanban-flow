import '@testing-library/jest-dom';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Initialize the Angular TestBed for a zoneless app (Angular 21 default).
// jest-preset-angular v16 dropped the old `setup-jest`, and its bundled
// zoneless setup-env trips over Angular 21's stricter module verification, so
// we bootstrap the browser testing environment directly. Zoneless change
// detection is the app default and isn't needed to unit-test stores/services.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
