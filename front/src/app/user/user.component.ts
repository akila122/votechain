import { Component, OnInit } from '@angular/core';

import { UserService } from './user.service';
import * as forge from 'node-forge';
import { MatDialog } from '@angular/material/dialog';
import { ResultViewComponent } from '../result-view/result-view.component';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css'],
})
export class UserComponent implements OnInit {
  idFile: File;
  privateFile: File;
  publicFile: File;
  msg1: string;
  msg2: string;
  spin: boolean;
  votingID: string;
  canVote: boolean;
  options: string[];
  publicKey: string;
  privateKey: string;
  option: string;
  show : boolean;
  results : any[] = [];

  constructor(private service: UserService,public dialog: MatDialog) {}

  public vote() {
    this.spin = true;
    let text = this.votingID;
    let privKey = forge.pki.privateKeyFromPem(this.privateKey);

    let md = forge.md.sha1.create();
    md.update(text, 'utf8');
    let voteSign = privKey.sign(md);

    let encode = localStorage.getItem("username") + ':' + this.option;

     this.service.addVote(this.votingID, this.publicKey, voteSign,encode).subscribe(
      (data) => {
        this.spin = false;
        this.msg1 = 'Voting done!';
      },
      (error) => {
        this.spin = false;
        this.msg1 = error.error;
      }
    );
  }

  public view() {
    this.results = [];
    this.show = false;
    this.spin = true;
    this.service.getResults(this.votingID).subscribe(data=>{
      console.log(JSON.stringify(data))
      this.spin = false;
      for(let i = 0;i<data.results.length;i++){
        if(i!=data.results.length-1){
          this.results.push({
            name:data.options[i],
            value:data.results[i]
          })
        }else{
          this.results.push({
            name:'Not voted',
            value:data.results[i]
          })
        }
      }
      let toSend = {
        data : this.results,
        info : data
      }
      const dialogRef = this.dialog.open(ResultViewComponent);
      dialogRef.componentInstance.data = toSend;
    },error=>{
      this.spin = false;
      this.msg2 = error.error;
    })
  }
  public f1(target) {
    this.idFile = target.files.item(0);
    let idReader = new FileReader();
    idReader.onload = (e) => {
      this.votingID = idReader.result.toString();
      this.spin = true;
      this.service.getOptions(this.votingID).subscribe(
        (data) => {
          this.spin = false;
          this.canVote = true;
          this.options = data.options;
        },
        (error) => {
          this.spin = false;
          this.msg1 = error.error;
        }
      );
    };
    idReader.readAsText(this.idFile);
  }
  public f2(target) {
    this.publicFile = target.files.item(0);
    let publicReader = new FileReader();
    publicReader.onload = (e) => {
      this.publicKey = publicReader.result.toString();
    };
    publicReader.readAsText(this.publicFile);
  }
  public f3(target) {
    this.privateFile = target.files.item(0);
    let privateReader = new FileReader();
    privateReader.onload = (e) => {
      this.privateKey = privateReader.result.toString();
    };
    privateReader.readAsText(this.privateFile);
  }
  public optionSelected(opt) {
    this.option = opt;
  }

  ngOnInit(): void {}
}
