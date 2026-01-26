import {
  Component,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { StatusBar } from '@capacitor/status-bar';
import { Auth } from 'src/app/core/services/auth/auth.service';
import { catchError, EMPTY, exhaustMap, filter, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalController } from '@ionic/angular';
import { OtpComponent } from 'src/app/shared/otp/otp/otp.component';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
  images = [
    'assets/images/login-slides/4.png',
    'assets/images/login-slides/2.png',
    'assets/images/login-slides/5.png',
    'assets/images/login-slides/6.png',
    'assets/images/login-slides/3.png',
    'assets/images/login-slides/7.png',
    'assets/images/login-slides/1.png',
  ];
  username: WritableSignal<string> = signal('');
  password: WritableSignal<string> = signal('');
  private destroyRef = inject(DestroyRef);
  public loginClick$ = new Subject<void>();

  constructor(
    private toastController: ToastController,
    private AuthService: Auth,
    private bottomSheet: ModalController
  ) {
    effect(() => {
      // console.log('username', this.username());
      // console.log('username', this.password());
    });
  }

  async ionViewWillEnter() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#f7d94f' });
  }

  ngOnInit() {
    this.login_api().subscribe({
      next: async (response: any) => {
        console.log('response', JSON.stringify(response));
        if (
          response.data.status === 'OTP_SUCCESS' ||
          response.data.status === 'OTP_NOT_EXPIRED'
        ) {
          const modal = await this.bottomSheet.create({
            component: OtpComponent,
            breakpoints: [0, 0.2],
            initialBreakpoint: 0.2,
            backdropBreakpoint: 0,
            handle: true,
            componentProps: {
              expiresAt: response.data.expiresAt,
              id: response.data?.id,
              username: this.username(),
              password: this.password(),
            },
          });
          await modal.present();

          const modal_data = await modal.onDidDismiss();
          const account = modal_data.data.auth;

          switch (account.role) {
            case 'buyer':
              this.AuthService.navigate('/tabs/home');
              break;
            case 'seller':
              this.AuthService.navigate('/tabs/home');
              break;
          }
        }
      },
      error: async (err: any) => {
        this.toastController
          .create({
            message: err?.message ?? 'Request failed',
            duration: 2500,
            position: 'top',
          })
          .then((toast) => toast.present());

        return EMPTY;
      },
    });
  }

  login_api() {
    return this.loginClick$.pipe(
      filter(() => this.username() !== '' && this.password() !== ''),
      exhaustMap(() => {
        return this.AuthService.checkCredentials$(
          this.username(),
          this.password()
        ).pipe();
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  ngOnDestroy() {}

  login() {}
}
