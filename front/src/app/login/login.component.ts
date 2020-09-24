import { Component, OnInit } from '@angular/core';
import { LoginService } from './login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  spin: boolean;
  name: string;
  surrname: string;
  email: string;
  password: string;
  username: string;
  msg: string;

  constructor(private service: LoginService, private router: Router) {}

  public login() {
    this.spin = true;
    this.service.login(this.username, this.password).subscribe(
      (data) => {
        this.msg = null;
        localStorage.setItem('username',this.username);
        localStorage.setItem('apiKey', data.token);
        this.spin = false;
        this.router.navigate(['/'+data.type.toLowerCase()])
      },
      (error) => {
        this.msg = error.error;
        this.spin = false;
      }
    );
  }
  public register() {
    this.spin = true;
    this.service
      .register(
        this.name,
        this.surrname,
        this.username,
        this.email,
        this.password
      )
      .subscribe(
        (data) => {
          this.msg = 'Registration completed!';
          this.spin = false;
        },
        (error) => {
          this.msg = JSON.stringify(error);
          this.spin = false;
        }
      );
  }
  ngOnInit(): void {}
}
