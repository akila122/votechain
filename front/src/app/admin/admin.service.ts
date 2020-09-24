import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalVarsService } from '../global-vars.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(private http: HttpClient, private gv: GlobalVarsService) {}

  getUsernames() {
    return this.http.get<any>(this.gv.getServerAPI() + '/usernames');
  }
  addVoting(name: string, options: string[], usernames: string[]) {
    let token: string = localStorage.getItem('apiKey');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    });

    return this.http.post<any>(
      this.gv.getServerAPI() + '/add_voting',
      { name: name, usernames: usernames, options: options },
      { headers: headers }
    );
  }
  closeVoting(votingID: string) {
    let token: string = localStorage.getItem('apiKey');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    });
    return this.http.post<any>(
      this.gv.getServerAPI() + '/close_voting',
      { votingID: votingID },
      { headers: headers }
    );
  }
  public getResults(votingID: string) {
    let token: string = localStorage.getItem('apiKey');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    });
    return this.http.post<any>(
      this.gv.getServerAPI() + '/voting_results',
      {
        votingID: votingID
      },
      { headers: headers }
    );
  }
}
