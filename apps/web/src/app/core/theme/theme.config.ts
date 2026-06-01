import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { ThemeService } from './theme.service';

export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([ThemeService]);
}
