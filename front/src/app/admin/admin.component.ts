import { Component, OnInit } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { ElementRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocompleteSelectedEvent,
  MatAutocomplete,
} from '@angular/material/autocomplete';

import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { ResultViewComponent } from '../result-view/result-view.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  msg1: string;
  msg2: string;
  msg3: string;
  spin: boolean;
  name: string;
  results: any;
  votingID: string;

  options: string[] = [];
  opt: string;

  public addOption() {
    this.options.push(this.opt);
  }
  public removeOption(option: string) {
    this.options = this.options.filter((opt) => opt != option);
  }
  public open() {
    if (this.options.length <= 1) {
      this.msg1 = 'Cannot create voting with less than two options';
    } else if (this.usernames.length == 0) {
      this.msg1 = 'Cannot create voting with no invitations';
    } else {
      this.spin = true;
      this.service.addVoting(this.name, this.options, this.usernames).subscribe(
        (data) => {
          this.spin = false;
          this.msg1 = 'Created a voting with ID : ' + data.votingID;
        },
        (error) => {
          this.spin = false;
          this.msg1 = error.error;
        }
      );
    }
  }
  public close() {
    this.spin = true;
    this.service.closeVoting(this.votingID).subscribe(
      (data) => {
        this.msg2 = data.msg;
        this.spin = false;
      },
      (error) => {
        this.msg2 = error.error;
        this.spin = false;
      }
    );
  }
  public view() {
    this.results = [];
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

  visible1 = true;
  selectable1 = true;
  removable1 = true;
  addOnBlur1 = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  add1(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      this.options.push(value.trim());
    }

    if (input) {
      input.value = '';
    }
  }

  remove1(o): void {
    const index = this.options.indexOf(o);

    if (index >= 0) {
      this.options.splice(index, 1);
    }
  }

  visible = true;
  selectable = true;
  removable = true;

  usernameCtrl = new FormControl();
  filteredUsernames: Observable<string[]>;
  usernames: string[] = [];
  allUsernames: string[] = [];

  @ViewChild('usernameInput') usernameInput: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete: MatAutocomplete;

  constructor(private service: AdminService,public dialog: MatDialog) {
    this.filteredUsernames = this.usernameCtrl.valueChanges.pipe(
      startWith(null),
      map((username: string | null) =>
        username ? this._filter(username) : this.allUsernames.slice()
      )
    );
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      this.usernames.push(value.trim());
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.usernameCtrl.setValue(null);
  }

  remove(username: string): void {
    const index = this.usernames.indexOf(username);

    if (index >= 0) {
      this.usernames.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.usernames.push(event.option.viewValue);
    this.usernameInput.nativeElement.value = '';
    this.usernameCtrl.setValue(null);
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.allUsernames.filter(
      (username) => username.toLowerCase().indexOf(filterValue) === 0
    );
  }

  ngOnInit(): void {
    this.service.getUsernames().subscribe((data) => {
      this.allUsernames = data.usernames;
    });
  }
}
