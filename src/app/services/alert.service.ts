import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  success(title: string, message: string): void {
    void Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#0052cc',
      timer: 3000,
      timerProgressBar: true
    });
  }

  successAndWait(title: string, message: string): Promise<any> {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#0052cc'
    });
  }

  error(title: string, message: string): void {
    void Swal.fire({
      title: title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#0052cc'
    });
  }

  warning(title: string, message: string): void {
    void Swal.fire({
      title: title,
      text: message,
      icon: 'warning',
      confirmButtonColor: '#0052cc'
    });
  }

  validation(message: string): void {
    void Swal.fire({
      title: 'Missing Fields',
      text: message,
      icon: 'warning',
      confirmButtonColor: '#0052cc',
      toast: true,
      position: 'top-end',
      timer: 4000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  confirm(title: string, message: string): Promise<any> {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0052cc',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, proceed!'
    });
  }
}
