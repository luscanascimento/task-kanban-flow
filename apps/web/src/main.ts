import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

async function enableMockApi(): Promise<void> {
  if (!environment.useMockApi) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMockApi()
  .catch((error) => console.error('Failed to start mock API worker', error))
  .finally(() => {
    bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
  });
