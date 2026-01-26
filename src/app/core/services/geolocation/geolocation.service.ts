import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpRequest } from '../http-request/http-request.service';
import { BehaviorSubject } from 'rxjs';
import { IUserData } from '../../interfaces/user.interface';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IResponse } from '../../interfaces/response.interface';
@Injectable({
  providedIn: 'root',
})
export class Geolocation {
  constructor() {}

  async getCurrentPosition(): Promise<GeolocationPosition> {
    // Check permission first
    const permissionStatus = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });

    if (permissionStatus.state === 'denied') {
      throw new Error('Location access has been denied by the user.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('User denied the request for Geolocation.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable.'));
              break;
            case error.TIMEOUT:
              reject(new Error('The request to get user location timed out.'));
              break;
            default:
              reject(new Error('An unknown error occurred.'));
              break;
          }
        }
      );
    });
  }
}
