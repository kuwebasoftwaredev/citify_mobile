import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  IonContent,
  IonInputOtp,
  ToastController,
} from '@ionic/angular/standalone';
import { CountDownPipe } from '../../pipes/count-down/count-down-pipe';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { Auth } from 'src/app/core/services/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalController } from '@ionic/angular';
import { setAuth, setAuthSuccess } from 'src/app/state/auth/auth.actions';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';

@Component({
  standalone: true,
  imports: [IonContent, IonInputOtp, CountDownPipe],
  selector: 'app-otp',
  templateUrl: './otp.component.html',
  styleUrls: ['./otp.component.scss'],
})
export class OtpComponent implements OnInit {
  @Input() expiresAt!: number;
  @Input() id!: string;
  @Input() username!: string;
  @Input() password!: string;
  @ViewChild('otp') otpInput!: IonInputOtp;
  public countdownValue: string = '00:00';
  public isExpired = false;
  public resendOTPClick$ = new Subject<void>();
  public checkOTP$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);
  private actions$ = inject(Actions);
  constructor(
    private AuthService: Auth,
    private toastController: ToastController,
    private modalCtrl: ModalController,
    private store: Store
  ) {}

  ngOnInit() {
    this.resendOTP_API().subscribe({
      next: async (response: any) => {
        if (response.body.status === 'OTP_SUCCESS') {
          const toast = await this.toastController.create({
            message: 'OTP resent successfully.',
            duration: 2500,
            position: 'top',
          });
          await toast.present();

          this.otpInput.value = '';
          this.expiresAt = response.body.expiresAt;
          this.isExpired = false;
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

    this.actions$
      .pipe(ofType(setAuthSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.modalCtrl.dismiss(data);
      });
  }

  resendOTP_API(): Observable<any> {
    return this.resendOTPClick$.pipe(
      filter(() => this.username !== '' && this.password !== ''),
      exhaustMap(() => {
        return this.AuthService.checkCredentials$(this.username, this.password);
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  checkOTP_API() {
    const otp = this.otpInput.value as string;
    const userId = this.id as string;
    this.store.dispatch(setAuth({ userId, otp }));

    //  this.modalCtrl.dismiss(response.data.account);
  }

  updateCountdown(val: string) {
    this.countdownValue = val;
    this.isExpired = val === '00:00';
  }
}
