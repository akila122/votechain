import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalVarsService {

  serverAPI : string = "https://localhost:3000";

  getServerAPI(){
    return this.serverAPI;
  }
  constructor() { }
}
