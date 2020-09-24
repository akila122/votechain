import { Injectable } from '@angular/core';
import { GlobalVarsService } from '../global-vars.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private gv: GlobalVarsService, private http: HttpClient) {}

  public getOptions(votingID: string) {
    let token: string = localStorage.getItem('apiKey');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    });
    return this.http.post<any>(
      this.gv.getServerAPI() + '/voting_options',
      {
        votingID: votingID,
      },
      { headers: headers }
    );
  }

  public addVote(
    votingID: string,
    publicKey: string,
    voteSign: string,
    encode: string
  ) {
    let token: string = localStorage.getItem('apiKey');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    });
    return this.http.post<any>(
      this.gv.getServerAPI() + '/add_vote',
      {
        votingID: votingID,
        publicKey: publicKey,
        voteSign: voteSign,
        encode: encode,
      },
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
