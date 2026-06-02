import { type Routes } from '@angular/router';

import { LoginComponent } from '../presentation/login/login.component';
import { RegisterComponent } from '../presentation/register/register.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
];
