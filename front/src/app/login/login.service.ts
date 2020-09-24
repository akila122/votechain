import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GlobalVarsService } from '../global-vars.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(private http: HttpClient, private gv: GlobalVarsService) {}
  login(username: string, password: string) {
    return this.http.post<any>(this.gv.getServerAPI() + '/login', {
      username: username,
      password: password,
    });
  }
  register(
    name: string,
    surrname: string,
    username: string,
    email: string,
    password: string
  ) {
    return this.http.post<any>(
      this.gv.getServerAPI() + '/registration',
      {
        username: username,
        password: password,
        name: name,
        surrname: surrname,
        email: email,
        type: 'USER',
      },
      { responseType: 'text' as 'json' }
    );
  }
}
